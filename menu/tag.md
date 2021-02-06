---
layout: page
title: "Tags"
---
{% for tag in site.tags %}
    <a href="#{{ tag | first }}">{{ tag | first }}</a>
{% endfor %}

{% for tag in site.tags %}
    <a name="#{{ tag | first }}">{{ tag | first }}</a>
    <ul>
        {% for post in tag.last %}
          <li>
            <a href="{{ site.url }}{{ post.url }}">{{ post.title }}</a>
            <small>{{ post.date | date: "%B %-d, %Y" }}</small>
          </li>
        {% endfor %}
    </ul>
{% endfor %}