#4sq-friends-crawler
一个foursquare用户following关系的爬虫

用法：
把需要获取的用户的id放在同一目录下命名为users.txt
然后使用`supervisor index.js`
程序会在目录下生成一个 `done.txt` 和 `data.txt` 分别表示已经爬完的用户和对应的数据

TODO list:
- 因为afterMarker是有规律的，所以对于每个人也可以做到异步，感觉目前并找不到这样的规律
