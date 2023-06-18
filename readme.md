# Odo: Optimize Your Data Transmission

Odo is an object creator that decouples data values from their structural definition, providing a more efficient way to transmit data, especially over web sockets. By defining values as a simple flat array and describing the structure as offsets within this array, Odo makes it possible to optimize the transfer of information for different use cases.

![Demo of how to use Odo](./odo-demo.gif?raw=true | width=370)

## Why Odo?

While Odo was primarily designed for optimizing data transmission over web sockets, it can be used in any scenario where you need to separate data structure from its values. While the original purpose was focused on using numeric values due to web socket limitations, Odo itself doesn't impose such a restriction. It supports translator methods to convert values, adding another layer of flexibility.

## Using Odo

Odo is designed to handle frequent updates to values while keeping structural updates to a minimum. After creating an object with Odo, you can use the provided methods to manipulate the object.

### Setting Values and Structure

```js
const a = new Odo();
a.setValues([0, 1, 2, 3, 4, 5, 6, 7]);
a.addStructure({
  "position.x": 0,
  "position.y": [1, (v) => `${v}${v}`],
  "list": [3, 8, (list) => list.map((v) => v + 1)]
});
```

This creates an object with the structure shown below.

```js
{
  "position": { "x": 0, "y": "11" },
  "list": [4, 5, 6, 7, 8]
}
```

> ! Note that the original Odo methods still exist on this object. If you want to get back to a plain object you can use the `.export()` method. Be aware that exporting uses `JSON.stringify` and `JSON.parse` under the hood, so it will only support JSON types (e.g. not functions), and is not optimal to be called at high frequency.

### Updating Values

When your values change, you can call `.setValues()` on the same object.

```js
a.setValues([10, 11, 12, 13, 14, 15, 16, 17])
```

Odo uses getters to update the properties of your object as you change the values at different offsets. Values that are set without a corresponding structure are ignored.

```js
{
  "position": {"x": 10, "y": "1111"},
  "list": [14,15,16,17,18]
}
```

### Updating Structure

If you need to update the structure, Odo provides the `.addStructure()` and `.resetStructure()` methods. Remember, if you're updating the structure as frequently as the values, a normal object might be a better choice.

```js
a.resetStructure();
a.addStructure({
  "pair.x": 3,
  "pair.y": 4,
  "pair.z": 5,
  "another.x": 0,
  "another.y": 1,
  "yet.x": 2,
  "yet.y": 6,
});
```

The updated structure, with the previously set values, would produce an object like the following:

```js
{
  "pair": {"x": 13, "y": 14, "z": 15},
  "another": {"x": 10, "y": 11},
  "yet": {"x": 12, "y": 16},
}
```

## Structure Definition

You define structure in Odo using a dot-separated path as a key. The corresponding value provides Odo with instructions on how to interpret the structure.

Here's how you can represent different structures:

### Single Value

If you want to represent a single value from the values list, you can do so by directly assigning the index of the value from the values array.

```js
a.addStructure({ 'path.to.property': 3 });
```

This will assign the value at index `3` in the values array to the property `path.to.property` in your Odo object.

### Array Slice

If you want to represent a range of values from the values list, you can do so by providing the start and end indices in an array. This is similar to how you would create a slice of an array. So you can also use negative indexes.

```js
a.addStructure({ 'path.to.property': [3, 7] });
```

This will assign the values from indices `3` to `7` (excluding `7`) in the values array to the property `path.to.property` in your Odo object.

### Using a Modifier Function

You can also use a modifier function to change the value(s) before they are assigned to the property.

```js
a.addStructure({ 'path.to.property': [3, (v) => v * 2] });
a.addStructure({ 'path.to.property': [3, 7, (v) => v.map((x) => x * 2)] });
```

In the first example, the value at index `3` is multiplied by `2` before being assigned to the property `path.to.property`. In the second example, the values from indices `3` to `7` (excluding `7`) are each multiplied by `2` before being assigned to the property `path.to.property`.

With these options, you can define complex structures while keeping the way you set the values simple and consistent.

## Installation

To install Odo via npm, use the following command:

```bash
npm i @spiraldust/odo --save
```

## Importing

Odo supports both CommonJS and ECMAScript Module (ESM) import styles. Here's how you can import it in your project:

```js
// ESM import
import Odo from 'odo';

// CommonJS import
const Odo = require('odo').default;
```

## Developing

The repository includes a development build process to facilitate testing and further development of Odo. To start the development process, use the following command:

```bash
npm start
```

This will launch a local server and the test page will be available at `http://localhost:1234`.

## Building

Building Odo is simple thanks to Parcel. You can build the project using the following command:

```bash
npm run build
```

This will generate the build files necessary for deployment or further testing and can be found in the `dist` folder.

## With thanks to...

Just a shout out to say thanks to the hard work of all the open source development community, without which, this repo would not have been so easy to formulate or distribute.

This repo has no proper dependencies, but it relys on the following dev dependencies:

- babel
- jest
- parcel

And also these developer conventions and systems:

- git
- .editorconfig
