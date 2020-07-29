---
layout: page
title: "Tags"
---
<ul>
  {% for tag in site.tags %}
    <li>
      <p onclick="slide_post_list('{{ tag | first }}')">{{ tag | first }}</p>
      <ul style="display: none;" id="posts_in_{{ tag | first }}">
        {% for post in tag.last %}
          <li>
            <a href="{{ site.url }}{{ post.url }}">{{ post.title }}</a>
            <small>{{ post.date | date: "%B %-d, %Y" }}</small>
          </li>
        {% endfor %}
      </ul>
    </li>
  {% endfor %}
</ul>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>

<script>
  function slide_post_list(tag){
    var id = "#posts_in_"+tag;
    $(id).slideToggle();
  }
</script>