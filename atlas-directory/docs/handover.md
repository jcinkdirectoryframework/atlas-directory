# Atlas Handover

## Project

Atlas

A dependency-free, HTML-driven directory engine.

---

## Current Version

0.1.0-dev

---

## Current Milestone

Project foundation

---

## Completed

* Project philosophy established.
* Core architecture defined.
* HTML vocabulary agreed.
* Semantic field system chosen.
* One public `Atlas` class agreed.
* JCink selected as the first supported adapter.
* Documentation structure established.

---

## Current Folder Structure

```text
src/
    core/
    modules/
    adapters/
    styles/
    utils/

demo/
docs/
examples/
dist/
tests/
```

---

## Design Principles

* HTML is the public API.
* Semantic markup over configuration.
* One public class.
* Zero dependencies.
* CSS handles presentation.
* JavaScript handles behaviour.
* Read the DOM once.
* Everything is data.

---

## Next Milestone

Implement the `Atlas` core class.

Goals:

* Discover the Atlas root.
* Validate configuration.
* Prepare the application lifecycle.

No searching, filtering or rendering yet.

---

## Long-Term Vision

Atlas should become a generic, HTML-first directory framework that is independent of JCink while providing a first-class JCink adapter.

The framework should be approachable for forum skinners, performant with large member lists, and extensible through semantic HTML rather than JavaScript.