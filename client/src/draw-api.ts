import { Coords } from "./definitions"

export function createLinePart(
    ctx: CanvasRenderingContext2D,
    [x, y]: Coords,
    size: number,
    color: string
) {
    ctx.lineWidth = size
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.strokeStyle = color

    ctx.lineTo(x, y)
    ctx.stroke()
}

export function createEndLine (ctx: CanvasRenderingContext2D) {
    ctx.stroke()
    ctx.beginPath()
}
