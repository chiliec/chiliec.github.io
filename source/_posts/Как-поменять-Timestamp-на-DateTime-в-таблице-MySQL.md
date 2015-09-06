title: Как поменять Timestamp на DateTime в таблице MySQL
date: 2014-08-23 19:18:56
tags: MySQL
categories:
---
Переносил сайт с самописной CMS, в которой дата хранилась в формате Unix_timestamp, и собственно, возник вопрос: как же изменить `Timestamp` на `DateTime` в таблице *MySQL*. А решается это созданием нового поля с типом *DATETIME* и выполнением одного простого запроса: <!-- more -->
~~~sql
UPDATE table_name SET datetime_column = FROM_UNIXTIME(timestamp_column, '%Y-%m-%d %H:%i:%s');
~~~
где `table_name` - имя таблицы, `datetime_column` - новое поле с типом DATETIME, `timestamp_column` - поле с содержащимися в нем Timestamp's.
