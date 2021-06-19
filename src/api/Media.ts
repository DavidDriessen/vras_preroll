import Parse from 'parse/node'
import ytdl from 'ytdl-core'
import fs from 'fs'
import {MultiBar, SingleBar} from "cli-progress";
import request from 'request'

export enum MediaFormat {
  TV = 'TV',
  TV_SHORT = 'TV_SHORT',
  MOVIE = 'MOVIE',
  SPECIAL = 'SPECIAL',
  OVA = 'OVA',
  ONA = 'ONA',
  Game = 'Game',
}

export enum MediaSource {
  ORIGINAL = 'ORIGINAL',
  MANGA = 'MANGA',
  LIGHT_NOVEL = 'LIGHT_NOVEL',
  VISUAL_NOVEL = 'VISUAL_NOVEL',
  VIDEO_GAME = 'VIDEO_GAME',
  OTHER = 'OTHER',
  NOVEL = 'NOVEL',
  DOUJINSHI = 'DOUJINSHI',
  ANIME = 'ANIME',
}

export enum MediaSeason {
  WINTER = 'WINTER',
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  FALL = 'FALL',
}

export enum MediaStatus {
  FINISHED = 'FINISHED',
  RELEASING = 'RELEASING',
  NOT_YET_RELEASED = 'NOT_YET_RELEASED',
  CANCELLED = 'CANCELLED',
}

export default interface Media {
  id: string
  format: MediaFormat
  title: string
  japaneseTitle: string
  nativeTitle: string
  description: string
  genres: string[]
  image: string
  imageSmall?: string
  banner: string
  trailer?: string
  episodes: number
  duration: number
  status: MediaStatus
  season: MediaSeason
  seasonYear: number
  source: MediaSource
  studios: string[]
  startDate?: Date
  endDate?: Date
}

export class MediaClass extends Parse.Object implements Media {
  constructor() {
    super('Media')
  }

  get title() {
    return this.get('title')
  }

  get banner() {
    return this.get('banner')
  }

  get description() {
    return this.get('description')
  }

  get duration() {
    return this.get('duration')
  }

  get episodes() {
    return this.get('episodes')
  }

  get format() {
    return this.get('format')
  }

  get genres() {
    return this.get('genres')
  }

  get japaneseTitle() {
    return this.get('japaneseTitle')
  }

  get nativeTitle() {
    return this.get('nativeTitle')
  }

  get season() {
    return this.get('season')
  }

  get seasonYear() {
    return this.get('seasonYear')
  }

  get source() {
    return this.get('source')
  }

  get status() {
    return this.get('status')
  }

  get studios() {
    return this.get('studios')
  }

  get endDate() {
    return this.get('endDate')
  }

  get startDate() {
    return this.get('startDate')
  }

  trailer?: string
  image: string = ""

  trailerDownloaded(dir: string) {
    if (!this.trailer) {
      const filename = this.get('title') + '.mp4'
      this.trailer = dir + '/' + filename
    }
    return fs.existsSync(this.trailer)
  }


  downloadTrailer(dir: string, multiBar: MultiBar) {
    if (!this.trailer)
      throw Error('Please call trailerDownloaded before downloadTrailer.')
    const bar = multiBar.create(1, 0, { filename: this.get('title') + '.mp4'})
    return new Promise((resolve) => {
      ytdl(this.get('trailer'), { quality: "highest" })
        .on('progress', (chunk: number, downloaded: number, total) => {
          bar.setTotal(total)
          bar.update(downloaded)
        })
        .pipe(fs.createWriteStream(this.trailer as string))
        .on('close', () => {
          bar.update(bar.getTotal())
          multiBar.remove(bar)
          resolve(true)
        })
    })
  }

  imageDownloaded(dir: string) {
    if (!this.image) {
      const filename = (this.get('image') as Parse.File).name()
      this.image = dir + '/' + filename
    }
    return fs.existsSync(this.image)
  }

  downloadImage(dir: string, multiBar: MultiBar) {
    if (!this.image)
      throw Error('Please call imageDownloaded before downloadImage.')
    let bar: SingleBar
    return new Promise((resolve) => {
      request((this.get('image') as Parse.File).url())
        .on('response', (res) => {
          bar = multiBar.create(parseInt(res.headers['content-length'] as string), 0)
          bar.update({ filename: (this.get('image') as Parse.File).name() })
          res.pipe(fs.createWriteStream(this.image))
            .on('close', () => {
              bar.update(bar.getTotal())
              multiBar.remove(bar)
              resolve(true)
            })
        })
        .on('data', function (chunk) {
          if (bar)
            bar.increment(chunk.length)
        })
    })
  }
}
