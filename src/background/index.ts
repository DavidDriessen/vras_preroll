import { readFile } from 'fs/promises'
import nodeHtmlToImage from 'node-html-to-image'
import {MediaClass} from "~/api/Media";
import {EventClass} from "~/api/Event";
import fs from "fs";

export async function renderBackground(media: MediaClass[], currentSession: EventClass): Promise<string> {
  if (!fs.existsSync('./Backgrounds')){
    fs.mkdirSync('./Backgrounds');
  }
  const outputFile = './Backgrounds/' + currentSession.title + '.png'
  await nodeHtmlToImage({
    output: outputFile,
    html: (await readFile(__dirname + '/index.html')).toString(),
    transparent: true,
    content: {
      posters: media.slice(0, 6).map((m) => m.image),
      current: {
        title: currentSession.title,
        poster: currentSession.image,
        posters: currentSession.media.map((m: { media: MediaClass }) => m.media.image)
      }
    },
  })
  return outputFile
}
