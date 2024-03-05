import { Setter } from "solid-js"
import { historyStore } from "../MainScreen"
import { CMDS } from "../definitions"

interface Props {
    brushSize: number
    setBrushSize: Setter<number>
}

export default function Controls(props: Props) {
    const [_, setHistory] = historyStore

    function undo() {
        setHistory(prev => {
            let endIdx = 0

            const start = prev.cursor === -1 ? prev.items.length - 1 : prev.cursor

            for (let i = start - 1; i > 0; i--) {
                if (prev.items[i].cmd !== CMDS.ENDLINE) continue

                endIdx = i
                break
            }

            return { ...prev, cursor: endIdx }
        })
    }

    function redo() {
        setHistory(prev => {
            if (prev.cursor === -1) return prev

            let endIdx = prev.cursor

            for (let i = prev.cursor + 1; i < prev.items.length; i++) {
                if (prev.items[i].cmd !== CMDS.ENDLINE) continue

                endIdx = i
                break
            }

            return { ...prev, cursor: endIdx }
        })
    }

    window.addEventListener("keydown", function(event: KeyboardEvent) {
        if (event.ctrlKey && event.key === "z") undo()
    })

    return (
        <div
            class="controls"
        >
            <input class="controls__size" value={props.brushSize} onInput={(event) => {
                const value = event.currentTarget.value

                if (!/^\d+$/.test(value)) {
                    event.currentTarget.value = props.brushSize.toString()
                } else {
                    props.setBrushSize(parseInt(value))
                }
            }} />
            <button class="controls__undo" onClick={undo} >⟳</button>
            <button class="controls__redo" onClick={redo} >⟳</button>
        </div>
    )
}
