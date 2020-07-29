---
layout: page
title: Categories
---
<ul>
  {% for category in site.categories %}
  <li>
    <p onclick="slide_post_list('{{ category | first }}')">{{category | first}}</p>
    <ul id="posts_in_{{ category | first }}" style="display: none">
      {% for post in category.last %}
      <li>
      <a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a>
      <small>{{ post.date | date_to_string }}</small>
      </li>
      {% endfor %}
    </ul>
  </li>
  {% endfor %}
</ul>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<script>
  function slide_post_list(category){
    var list_id = '#posts_in_'+category;
    console.log(list_id);
    $(list_id).slideToggle();
  }
</script>