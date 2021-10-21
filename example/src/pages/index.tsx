import Head from 'next/head'
import Link from 'next/link'
import { Routes } from ".blitz"

export default function Home() {
  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="title">
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>

        <Link href={Routes.User({ name: "abc" })} passHref={true}>
          <a>User with name "ABC"</a>
        </Link>
      </main>
    </div>
  )
}
