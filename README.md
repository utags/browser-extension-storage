# browser-extension-storage

Storage API wrapper for browser extensions, userscripts and bookmarklets.

Made for [browser-extension-starter](https://github.com/utags/browser-extension-starter).

## Usage

```bash
npm i browser-extension-storage
# or
pnpm add browser-extension-storage
# or
yarn add browser-extension-storage
```

### Chrome, Firefox extensions

```js
import {
  getValue,
  setValue,
  deleteValue,
  listValues,
  addValueChangeListener,
} from "browser-extension-storage"
```

### Userscripts

```js
import {
  getValue,
  setValue,
  deleteValue,
  listValues,
  addValueChangeListener,
} from "browser-extension-storage/userscript"
```

### localStorage

```js
import {
  getValue,
  setValue,
  deleteValue,
  listValues,
  addValueChangeListener,
} from "browser-extension-storage/local-storage"
```

## License

Copyright (c) 2023 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](LICENSE).

## >\_

[![Pipecraft](https://img.shields.io/badge/site-pipecraft-brightgreen)](https://www.pipecraft.net)
[![UTags](https://img.shields.io/badge/site-UTags-brightgreen)](https://utags.pipecraft.net)
[![DTO](https://img.shields.io/badge/site-DTO-brightgreen)](https://dto.pipecraft.net)
[![BestXTools](https://img.shields.io/badge/site-bestxtools-brightgreen)](https://www.bestxtools.com)
