
import ffmpeg from 'fluent-ffmpeg'

export class Node {
  _inputs: Node[] = []
  _edge: { inputs: string[]; outputs: string[] } = { inputs: [], outputs: [] }

  split(n: number): Node[] {
    return Array(n).fill(this.filter('split', n.toString()))
  }

  static concat(input: Node[], options: any | string | any[]) {
    return new FilterNode(input, 'concat', options)
  }

  overlay(input: Node, options: any | string | any[]) {
    return new FilterNode([this, input], 'overlay', options)
  }

  filter(filter: string, options: any | string | any[]) {
    return new FilterNode([this], filter, options)
  }

  getInputs(): InputNode[] {
    return this._inputs.flatMap((i) => i.getInputs())
  }

  getNodes(): Node[] {
    return this._inputs.flatMap((i) => i.getNodes()).concat([this])
  }

  getEdges(): { input: Node, output: Node }[] {
    return this._inputs.map((i) => ({ input: i, output: this}))
  }

  addEdgeInput(i: string) {
    this._edge.inputs.push(i)
  }

  addEdgeOutput(i: string) {
    this._edge.outputs.push(i)
  }

  output(file: string) {
    const inputs = [...new Set(this.getInputs())]
    const nodes = [...new Set(this.getNodes())]
    let edgeCount = 0
    for(const edge of nodes.flatMap((n) => n.getEdges())) {
      if (edge.input instanceof VideoNode || edge.input instanceof AudioNode) {
        const mod = edge.input instanceof VideoNode ? ':v' : ':a'
        if (edge.input.node instanceof InputNode) {
          const index = inputs.indexOf(edge.input.node)
          edge.output.addEdgeInput(index.toString() + mod)
        } else {
          edge.input.addEdgeOutput('v' + edgeCount)
          edge.output.addEdgeInput('v' + edgeCount + mod)
          edgeCount += 1
        }
      } else {
        if (edge.input instanceof InputNode) {
          const index = inputs.indexOf(edge.input)
          edge.output.addEdgeInput(index.toString())
        } else {
          edge.input.addEdgeOutput('v' + edgeCount)
          edge.output.addEdgeInput('v' + edgeCount)
          edgeCount += 1
        }
      }
    }
    const cmd = ffmpeg()
    for (const input of inputs) {
      cmd.input(input.file)
    }
    let map
    this._edge.outputs.push('v' + edgeCount)
    map = 'v' + edgeCount
    cmd.complexFilter(nodes.map((n)=>{
      if (n instanceof FilterNode) {
        return {
          filter: n._filter, options: n._options,
          inputs: n._edge.inputs, outputs: n._edge.outputs
        }
      } else {
        throw Error('Something is wrong')
      }
    }), map)
    cmd.output(file)
    return cmd
  }

  video() {
    return new VideoNode(this)
  }

  audio() {
    return new AudioNode(this)
  }
}

export class InputNode extends Node {
  file: string
  constructor(file: string) {
    super();
    this.file = file
    return this
  }

  getInputs() {
    return [this]
  }

  getNodes() {
    return []
  }
}

export class VideoNode extends Node {
  node: Node
  constructor(node: Node) {
    super()
    this.node = node
  }

  getInputs(): InputNode[] {
    return this.node.getInputs()
  }

  getNodes(): Node[] {
    return this.node.getNodes()
  }

  getEdges(): { input: Node, output: Node }[] {
    return this.node._inputs.map((i) => ({ input: i, output: this}))
  }

  addEdgeInput(i: string) {
    this.node.addEdgeInput(i)
  }

  addEdgeOutput(i: string) {
    this.node.addEdgeOutput(i)
  }
}

export class AudioNode extends Node {
  node: Node
  constructor(node: Node) {
    super()
    this.node = node
  }

  getInputs(): InputNode[] {
    return this.node.getInputs()
  }

  getNodes(): Node[] {
    return this.node.getNodes()
  }

  getEdges(): { input: Node, output: Node }[] {
    return this.node._inputs.map((i) => ({ input: i, output: this}))
  }

  addEdgeInput(i: string) {
    this.node.addEdgeInput(i)
  }

  addEdgeOutput(i: string) {
    this.node.addEdgeOutput(i)
  }
}

export class FilterNode extends Node {
  _filter: string
  _options: any | string | any[]

  constructor(inputs: Node[], filter: string, options: any | string | any[]) {
    super();
    this._inputs = inputs
    this._filter = filter
    this._options = options
  }
}


// // Example
//
// const interlace = require('interlace-arrays')
// const inputs = [
//   new InputNode('./Trailers/Combatants Will Be Dispatched!.mp4'),
//   new InputNode('./Trailers/I\'ve Been Killing Slimes for 300 Years and Maxed Out My Level.mp4'),
//   new InputNode('./Trailers/My Hero Academia Season 5.mp4')
// ]
// const vInputs = inputs.map((input) => {
//   const [a, b, c] = input.video().filter('scale', '640:480').split(3)
//   return a.filter('lutrgb', {g: 0, b: 0}).filter('pad', {w: 'iw*3', h: 'ih'})
//     .overlay(b.filter('lutrgb', {r: 0, b: 0}), {x: 'w', y: 0})
//     .overlay(c.filter('lutrgb', {g: 0, r: 0}), {x: '2*w', y: 0})
// })
// const aInputs = inputs.map((input) => input.audio())
// const out = Node.concat(interlace([vInputs, aInputs]), 'n=3:v=1:a=1').output('./concat.mp4')
// console.log(out._getArguments())
// out.run()
