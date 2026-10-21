import { REPO_URL, WHO_URL } from '../content/sources'

export default function Footer() {
  return <footer className="app-footer" aria-label="Project credits">
    <span>Data: <a href={WHO_URL}>WHO GHE 2023</a></span><span aria-hidden="true">·</span>
    <span>Anatomy: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D</a> (<a href="https://creativecommons.org/licenses/by/4.0/" aria-label="BodyParts3D license: CC BY 4.0">CC BY 4.0</a>)</span><span aria-hidden="true">·</span>
    <a href="#/about">Not medical advice</a><span aria-hidden="true">·</span><a href={REPO_URL}>GitHub</a>
  </footer>
}
