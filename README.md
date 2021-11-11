# next-route-manifest

[![npm](https://img.shields.io/npm/v/next-route-manifest)](https://npm.im/next-route-manifest)

Generates route manifest for Nextjs

## Usage

**1. Generate route manifest**
```sh
$ npx next-route-manifest
```

**2. Use generated manifest in `next/link` component's `href` prop**
```tsx
import Link from 'next/link'
import { Route } from './generated'

<Link href={Route.Home()}><a>Home</a></Link>
```
