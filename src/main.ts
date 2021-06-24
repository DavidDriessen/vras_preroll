import Inquirer from 'inquirer'
import {renderBackground} from './background'
import Api from './api'
import {InputNode, Node} from "./ffmpeg_wrapper";
import {EventClass} from "./api/Event";
import {MediaClass} from "./api/Media";
import {UserClass} from "./api/User";
import fs from "fs";
import cliProgress from "cli-progress";
import ffmpeg from "fluent-ffmpeg";

async function renderSession(session: EventClass, media: MediaClass[], args: { codec: string; nTrailers?: number } = { codec: 'libx264' }) {
  const interlace = require('interlace-arrays')
  const currentMediaIds: string[] = session.media.map((m: { media: MediaClass }) => m.media.id)
  media = media.filter((m) => !currentMediaIds.includes(m.id))
  const background = new InputNode(await renderBackground(media, session))
  if (!fs.existsSync('./Output')) {
    fs.mkdirSync('./Output');
  }
  return new Promise(async (resolve) => {
    const bar = new cliProgress.SingleBar({
      clearOnComplete: false,
      hideCursor: true,
      format: ' [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} frames | {fps}fps | {kbps}Kb/s | {size}KB | {mark}',
      barsize: 100,
    }, cliProgress.Presets.shades_grey)

    // @ts-ignore
    const trailers = media.slice(0, args.nTrailers || 2).map((m) => new InputNode(m.trailer))
    // Calculate number of frames to render based of trailer length
    const total = Math.ceil((await Promise.all(trailers.map((t) =>
      new Promise<number>((resolve1) => ffmpeg.ffprobe(t.file, (err, data) => {
        const frames = Number(data.streams[0].nb_frames) || 0
        const fps = Number(eval(data.streams[0].r_frame_rate || '24')) || 24
        resolve1(frames / fps * 25)
      }))
    ))).reduce((a, b) => a + b))

    const vTrailers = trailers.map((trailer) => trailer.video())
    const aTrailers = trailers.map((trailer) => trailer.audio())
    const out = background.overlay(
      Node.concat(interlace([vTrailers, aTrailers]), {n: trailers.length, v: 1, a: 1})
        .filter('scale', {w: 920, h: 517}),
      {x: 1920 - 920, y: 1080 - 516}).output('./Output/' + session.title + '.mp4')
    out.outputOptions('-vcodec ' + args.codec)
    out.fpsOutput(25)

    // console.log(out._getArguments())
    out.on('progress', (progress) => {
      bar.update(progress.frames, {
        fps: progress.currentFps,
        kbps: progress.currentKbps,
        size: progress.targetSize,
        mark: progress.timemark,
        frames: progress.frames,
        percent: progress.percent
      })
    })
    out.on('end', (stdout, stderr) => {
      bar.stop()
      resolve({stdout, stderr})
    })
    out.run()
    bar.start(total, 0)
  })
}

(async () => {
  const api = new Api('niVpAYWpnHGxwqa1GtUJNAdkXcuJQUJmwxHsX9oa', 'EZHAum1669EUT0UT5dSJj232x2NlZeixTpGbSDYz')
  const schedule = await api.getSchedule()
  return Inquirer.prompt([
    {
      type: 'list', name: 'session', message: 'What session do you want to render?', choices: schedule.map((e) => ({
        name: e.title + ' - ' + e.streamers.map((s: UserClass) => s.name).join(', '),
        short: e.title,
        value: e
      }))
    }
  ]).then(async (answers) => {
    return renderSession(answers.session, await api.getMedia(), { codec: 'libx264' })
  })
})()
