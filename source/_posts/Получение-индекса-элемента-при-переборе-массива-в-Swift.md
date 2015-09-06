title: Получение индекса элемента при переборе массива в Swift
date: 2015-09-05 13:28:59
tags: [swift]
categories:
---
Получение индекса элемента при переборе словаря довольно очевидно:
~~~
let dictionary = [0: "zero", 1: "one", 2: "two", 3: "three"]

for (key, value) in dictionary {
    println("\(key): \(value)")
}
~~~
Совсем по-другому дело обстоит с массивами: <!-- more -->
~~~
let array = ["zero", "one", "two", "three"]
~~~
Для получения индекса элемента при переборе массива в голову приходит лишь старый добрый цикл `for`:
~~~
for var i = 0; i < array.count; ++i {
    println("\(i): \(array[i])")
}
~~~
ну или чуть попроще цикл `for-in`:
~~~
for i in 0..<array.count {
    println("\(i): \(array[i])")
}
~~~
Однако в Свифте существует специальная [глобальная функция enumerate](http://stackoverflow.com/a/24028458), которая из элементов массива делает кортежи (tuple), состоящие как раз из индекса элемента и его значения:
~~~
for (key, value) in enumerate(array) {
    println("\(key): \(value)")
}
~~~
В Swift 2.0 её необходимо будет вызывать из самих типов, отвечающих протоколу [SequenceType](https://developer.apple.com/library/prerelease/ios/documentation/Swift/Reference/Swift_SequenceType_Protocol/index.html), вот так:
~~~
for (key, value) in array.enumerate() {
    print("\(key): \(value)")
}
~~~
