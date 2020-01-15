---
layout: page
title: "Tags"
---
{% for Tag in site.data.tags %}
# {{Tag.name}}
<ul>
{% for mypost in site.tags[Tag.tag] %}
        {% if listed_posts_urls contains mypost.url %}
        {% else %}
          <li>
              <a href="{{ site.github.url }}{{ mypost.url }}">
                  {{ mypost.title }}    <small>{{ mypost.date | date: "%B %-d, %Y" }}</small>
              </a>
          </li>
          {% assign listed_posts_urls = listed_posts_urls | push: mypost.url %}
        {% endif %}
      {% endfor %}
</ul>
{% endfor %}