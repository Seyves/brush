export type Coords = readonly [number, number]

export const CMDS = {
    LINE: "line",
    ENDLINE: "end-line",
    REG: "reg",
    UNREG: "unreg",
    MOVE: "move",
    UNDO: "undo"
} as const

export type Command = (typeof CMDS)[keyof typeof CMDS]

export interface WSMessage {
    cmd: Command,
    payload: string
}
