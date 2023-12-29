import { createMemo } from "solid-js"
import { Coords } from "../definitions"

interface Props {
    name: string
    color: string
    isSoft: boolean
    nextPosition: Coords
}

export default function Cursor(props: Props) {
    const svg = (
        <svg fill={props.color} height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 376.754 376.754" >
            <g>
                <path d="M44.072,0v376.754L156.699,241.53l175.982,0.643L44.072,0z M142.686,211.478l-68.613,82.38V64.335L249.896,211.87
                L142.686,211.478z"/>
            </g>
        </svg >
    )

    const style = createMemo(() => {
        return {
            transform: `translate(${props.nextPosition.x}px, ${props.nextPosition.y}px)`,
            transition: props.isSoft ? "all 0.14s" : "all 0.05s"
        }
    })

    return (
        <div class="cursor" style={style()}>
            {svg}
            <p>{props.name}</p>
        </div>
    )
}
