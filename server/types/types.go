package types

import "fmt"

type Color struct {
	Red   byte
	Green byte
	Blue  byte
}

func (color *Color) GetHex() string {
	return fmt.Sprintf("#%02X%02X%02X", color.Red, color.Green, color.Blue)
}

type IncomingMessage struct {
	Cmd     string `json:"cmd"`
	Payload string `json:"payload"`
}

type OutcomingMessage struct {
	Initiator string          `json:"initiator"`
	Message   IncomingMessage `json:"message"`
}
