import { Fragment } from 'react'

/** Splits text into masked words so GSAP can slide each one up from behind a clip. */
export default function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          <span className="word-mask"><span className="ab-word word">{w}</span></span>{' '}
        </Fragment>
      ))}
    </>
  )
}
