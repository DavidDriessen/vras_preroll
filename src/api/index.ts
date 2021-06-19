import fs from 'fs'
import Parse from 'parse/node'
import cliProgress from 'cli-progress'
import { MediaClass } from './Media';
import { EventClass } from './Event';
import { UserClass } from './User';

export default class Api {
  private cachedEvents?: EventClass[]

  constructor(appId: string, jsKey: string) {
    Parse.initialize(appId, jsKey)
    Parse.serverURL = 'https://vrasprod.b4a.io'
    Parse.Object.registerSubclass('Media', MediaClass)
    Parse.Object.registerSubclass('Event', EventClass)
    Parse.Object.registerSubclass('_User', UserClass)
  }

  async getSchedule() {
    if (!this.cachedEvents) {
      const query = new Parse.Query(EventClass)
      query.include(['streamers', 'media', 'media.media'])
      query.greaterThanOrEqualTo('start', new Date())
      query.ascending('start')
      this.cachedEvents = await query.find()
    }
    return this.cachedEvents
  }

  private static getMultiBar() {
    return new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: ' [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | {filename}',
      barsize: 100,
      formatValue: (v, options, type) => {
        switch (type) {
          case "value":
          case "total":
            return (v / 1024 / 1024).toFixed(2) + 'MB'
          default:
            return v.toString()
        }
      }
    }, cliProgress.Presets.shades_grey);
  }

  private async downloadTrailers(media: MediaClass[]) {
    const dir = './Trailers';
    media = media.filter((m) => !m.trailerDownloaded(dir))
    if (media.length === 0) return
    console.log('Downloading trailers...')
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    const multiBar = Api.getMultiBar()
    await Promise.all(media.map((m) => m.downloadTrailer(dir, multiBar)))
    multiBar.stop()
  }

  private async downloadImages(media: MediaClass[]) {
    const dir = './Posters';
    media = media.filter((m) => !m.imageDownloaded(dir))
    if (media.length === 0) return
    console.log('Downloading images...')
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    const multiBar = Api.getMultiBar()
    await Promise.all(media.map((m) => m.downloadImage(dir, multiBar)))
    multiBar.stop()
  }

  async getMedia() {
    const events = await this.getSchedule()
    const media = events.flatMap<MediaClass>((event) => event.media.map((m: { media: MediaClass }) => m.media))
      .filter((v: MediaClass, i, a: MediaClass[])=>a.findIndex(t => t.id === v.id) === i)
    await this.downloadTrailers(media)
    await this.downloadImages(media)
    return media
  }
}
