# td2svg
Javascript text (ascii) diagrams to svg

It is a very simple (and limited) translator from ascii diagrams to svg.

## Why another implementation?

There are many applications and libraries for doing this. None of them fulfill
my needs.  I want a very simple (and efficient) javascript library for writing
disgrams in my documents.
In particular, I need to write diagrams with text, boxes, lines and arrows.

## Features

Each box (rectangle) can have an identifier or class, so you can add styles to
them.  You can write your own styles below of diagram as in the next example:

```
        +-------
        |
        v
  +------------+                   +------------+ \
  |#a   r1     |<---------+------->|.b rect 2   | |
  +------------+          |        +------------+ |
         ^                +------->|.b   r3     | | blocks
         |                         +------------+ |
         |                         |.b   r4     | |
                                   +------------+ /

<style>
#a {fill: azure;}
.b {fill: yellow;}
</style>

```

## API

Call `td2svg(d)` where `d` is a string containing the diagram text. It will
return a string with the *svg* code.  When using client-side (browser), then you
can generate a DOM element (`<figure>`, for example) with the svg content
inside.

Ouput of above diagram example:

![svg output](example.svg)

## To do

1. Support for unicode characters
2. Shapes width rounded borders
3. Recognize other shapes
