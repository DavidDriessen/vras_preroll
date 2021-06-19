import Parse from 'parse/node'

export default interface User {
  id?: string
  name: string
  avatar: string
  discordId: string
}

export class UserClass extends Parse.User implements User{
  get discordId() {
    return this.get('discordId')
  }

  get name() {
    return this.get('name')
  }

  get avatar() {
    return this.get('avatar')
  }
}
