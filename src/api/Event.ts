import Parse from 'parse/node'
import { MediaClass } from './Media'
import { UserClass } from './User';


export default interface Event {
  id?: string
  parent?: Event
  title: string
  description?: string
  image?: string
  start: Date
  end: Date
  streamers: UserClass[]
  media: { media: MediaClass; episode: number; episodes: number }[]
}

export class EventClass extends Parse.Object implements Event{
  constructor() {
    super('Event')
  }

  get title() {
    return this.get('title')
  }

  get description() {
    return this.get('description')
  }

  get start() {
    return this.get('start')
  }

  get end() {
    return this.get('end')
  }

  get image() {
    return this.get('image')
  }

  get media() {
    return this.get('media')?.filter((m: { media: MediaClass }) => m.media) || []
  }

  get parent() {
    return this.get('parent')
  }

  get streamers() {
    return this.get('streamers')
  }
}
