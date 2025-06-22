---
title: Deploy Gemma-3-4b-it with vLLM
date: 2025-06-23
---
I tried to deploy [`gemma-3-4b-it`](https://huggingface.co/google/gemma-3-4b-it) with vLLM on docker compose.  
This is note for the specific settings.  
  
# Docker compose setting
```yaml
services:
  vllm:
    image: vllm/vllm-openai:v0.9.1
    runtime: nvidia
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ~/.cache/huggingface:/root/.cache/huggingface
      - ./tool_chat_template_gemma3_pythonic.jinja:/root/tool_chat_template_gemma3_pythonic.jinja
    environment:
      - HUGGING_FACE_HUB_TOKEN=${HUGGING_FACE_HUB_TOKEN}
    ports:
      - "8000:8000"
    ipc: host
    command: |
      --model google/gemma-3-4b-it --enable-auto-tool-choice --tool-call-parser pythonic --chat-template /root/tool_chat_template_gemma3_pythonic.jinja
```
To run the docker compose, need to set 
- `tool_chat_template_gemma3_pythonic.jinja` file
- env var `HUGGING_FACE_HUB_TOKEN`
  

To apply environment variable I did  
1. create `.env` file which defines `HUGGING_FACE_HUB_TOKEN`
2. run docker compose with `docker compose --env-file .env up -d`
  

# Tool call setting
You can find the details [here](https://github.com/vllm-project/vllm/pull/17149).  
__Summary__: need to apply custom jinja template for tool calling request.  
  

So I copied following jinja template and applied in the `command` setting in docker compose file.  
```jinja
{#- Begin-of-sequence token to start the model prompt -#}
{{ bos_token }}
{#- Extracts the system message. Gemma does not support system messages so it will be prepended to first user message. -#}
{%- if messages[0]['role'] == 'system' -%}
    {%- if messages[0]['content'] is string -%}
        {%- set first_user_prefix = messages[0]['content'] + '\n\n' -%}
    {%- else -%}
        {%- set first_user_prefix = messages[0]['content'][0]['text'] + '\n\n' -%}
    {%- endif -%}
    {%- set loop_messages = messages[1:] -%}
{%- else -%}
    {%- set first_user_prefix = "" -%}
    {%- set loop_messages = messages -%}
{%- endif -%}
{#- Set tools to none if not defined for this ChatCompletion request (helps avoid errors later) -#}
{%- if not tools is defined %}
    {%- set tools = none %}
{%- endif %}
{#- Validate alternating user/assistant messages (excluding 'tool' messages and ones with tool_calls) -#}
{%- for message in loop_messages | rejectattr("role", "equalto", "tool") | selectattr("tool_calls", "undefined") -%}
    {%- if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}
        {{ raise_exception("Conversation roles must alternate user/assistant/user/assistant/...") }}
    {%- endif -%}
{%- endfor -%}

{#- Main loop over all messages in the conversation history -#}
{%- for message in loop_messages -%}
    {#- Normalize roles for model prompt formatting -#}
    {%- if (message['role'] == 'assistant') -%}
        {%- set role = "model" -%}
    {%- elif (message['role'] == 'tool') -%}
        {%- set role = "user" -%}
    {%- else -%}
        {%- set role = message['role'] -%}
    {%- endif -%}
    {#- Mark the start of a message block with the appropriate role -#}
    {{ '<start_of_turn>' + role + '\n' -}}

    {#- Insert system message content (if present) at the beginning of the first message. -#}
    {%- if loop.first -%}
        {{ first_user_prefix }}
        {#- Append system message with tool information if using tools in message request. -#}
        {%- if tools is not none -%}
            {{- "Tools (functions) are available. If you decide to invoke one or more of the tools, you must respond with a python list of the function calls.\n" -}}
            {{- "Example Format: [func_name1(params_name1=params_value1, params_name2=params_value2...), func_name2(params)] \n" -}}
            {{- "Do not use variables. DO NOT USE MARKDOWN SYNTAX. You SHOULD NOT include any other text in the response if you call a function. If none of the functions can be used, point it out. If you lack the parameters required by the function, also point it out.\n" -}}
            {{- "Here is a list of functions in JSON format that you can invoke.\n" -}}
            {{- tools | tojson(indent=4) -}}
            {{- "\n\n" -}}
        {%- endif -%}
    {%- endif -%}

    {#- Format model tool calls (turns where model indicates they want to call a tool) -#}
    {%- if 'tool_calls' in message -%}
        {#- Opening bracket for tool call list. -#}
        {{- '[' -}}
        {#- For each tool call -#}
        {%- for tool_call in message.tool_calls -%}
            {#- Get tool call function. -#}
            {%- if tool_call.function is defined -%}
                {%- set tool_call = tool_call.function -%}
            {%- endif -%}
            {#- Function name & opening parenthesis. -#}
            {{- tool_call.name + '(' -}}

            {#-- Handle arguments as list (positional) or dict (named) --#}
            {#-- Named arguments (dict) --#}
            {%- if tool_call.arguments is iterable and tool_call.arguments is mapping -%}
                {%- set first = true -%}
                {%- for key, val in tool_call.arguments.items() -%}
                    {%- if not first %}, {% endif -%}
                    {{ key }}={{ val | tojson }}
                    {%- set first = false -%}
                {%- endfor -%}
            {#-- Positional arguments (list) --#}
            {%- elif tool_call.arguments is iterable -%}
                {{- tool_call.arguments | map('tojson') | join(', ') -}}
            {#-- Fallback: single positional value --#}
            {%- else -%}
                {{- tool_call.arguments | tojson -}}
            {#-- Closing parenthesis. --#}
            {%- endif -%}
                {{- ')' -}}
            {#-- If more than one tool call, place comma and move to formatting next tool call --#}
            {%- if not loop.last -%}, {% endif -%}
        {%- endfor -%}
        {#- Closing bracket for tool call list. -#}
        {{- ']' -}}
    {%- endif -%}
    
    {#- Tool response start tag (for messages from a tool) -#}
    {%- if (message['role'] == 'tool') -%}
        {{ '<tool_response>\n' -}}
    {%- endif -%}

    {#- Render the message content: handle plain string or multimodal content like image/text -#}
    {%- if message['content'] is string -%}
        {{ message['content'] | trim }}
    {%- elif message['content'] is iterable -%}
        {%- for item in message['content'] -%}
            {%- if item['type'] == 'image' -%}
                {{ '<start_of_image>' }}
            {%- elif item['type'] == 'text' -%}
                {{ item['text'] | trim }}
            {%- endif -%}
        {%- endfor -%}
    {%- else -%}
        {{ raise_exception("Invalid content type") }}
    {%- endif -%}

    {#- Tool response end tag -#}
    {%- if (message['role'] == 'tool') -%}
        {{ '</tool_response>' -}}
    {%- endif -%}

    {#- Mark end of a single turn -#}
    {{ '<end_of_turn>\n' }}
{%- endfor -%}

{#- If generation is to be triggered, add model prompt prefix -#}
{%- if add_generation_prompt -%}
    {{'<start_of_turn>model\n'}}
{%- endif -%}
```
  

# Example of usuage
```python
from litellm import Router

router = Router(
    model_list = [
        {
            "model_name": "rst0070/gemma-3-4b-it",
            "litellm_params": {
                "model": "hosted_vllm/google/gemma-3-4b-it",
                "api_base": "http://vllm-api/v1"
            },
            "model_info": {
                "supports_function_calling": True,
                "base_model": "google/gemma-3-4b-it"
            }
        }
    ]
)

messages = [
    {"role": "system", "content": "You have to choose at least one tool to run based on user's request."},
    {"role": "user", "content": "What's the weather like in San Francisco, Tokyo, and Paris?"}
]

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        },
    }
]

response = router.completion(
    model="rst0070/gemma-3-4b-it",
    messages=messages,
    tools=tools,
    tool_choice="required",  # auto 
)
```