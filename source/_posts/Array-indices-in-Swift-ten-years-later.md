---
title: "Array indices in Swift, ten years later: enumerated() gives you offsets"
date: 2026-09-30 19:00:00
tags: [swift]
categories:
---
In 2015 I wrote a short Russian post about getting an element's index while looping over an array in Swift. The answer back then was the global `enumerate(array)`, which Swift 2 turned into the method `array.enumerate()`. Swift is now at 6.3, the method is called `enumerated()`, and the old post missed the important part: `enumerated()` doesn't give you indices. <!-- more -->

## The easy case

~~~swift
let array = ["zero", "one", "two", "three"]

for (i, value) in array.enumerated() {
    print(i, value)
}
// 0 zero
// 1 one
// 2 two
// 3 three
~~~

For an `Array` starting at 0, the numbers are also valid indices, so this works and it's what most code does.

## Where it breaks

`enumerated()` counts from zero, whatever the collection is. The numbers are *offsets*. Take a slice:

~~~swift
let tail = array[2...]   // ArraySlice, indices 2 and 3

for (i, value) in tail.enumerated() {
    print(i, value)
}
// 0 two
// 1 three
~~~

A slice keeps its parent's indices, so `tail[0]` crashes. If you use the `i` from `enumerated()` to index back into a slice, the code works in tests on full arrays and crashes on the first slice.

## Indices, done properly

Pair each element with its real index:

~~~swift
for (i, value) in zip(tail.indices, tail) {
    print(i, value)
}
// 2 two
// 3 three
~~~

Or loop over the indices directly when you need to subscript:

~~~swift
for i in tail.indices {
    print(i, tail[i])
}
~~~

`zip(c.indices, c)` works for any collection, including those whose indices aren't integers at all, like `String`:

~~~swift
let s = "héllo"
for (i, c) in zip(s.indices, s) {
    // i is a String.Index, s[i] == c
}
~~~

## The rule

- Want a counter ("row 1, row 2…")? Use `enumerated()`.
- Want to subscript the collection? Use `indices` or `zip(c.indices, c)`.

All snippets checked with Swift 6.3.1.
