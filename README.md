# Overlay: MIDI Control

This project is a simple MIDI input/output control board that is flexible with a [`VoiceMap`](./src/scripts/VoiceMap.js).

> Currently, there are no means to select Input/Output MIDI Ports, and all will be listened to and sent over.

## VoiceMap

The `VoiceMap` is a very simple mapping of an ID to `VoiceData`.

`VoiceData` Structure:

* `name`: The Display Name/Label in the UI
* `status`: MIDI Status Byte as a Decimal Value
* `data1`: First Tuple of the Data Bytes
* `exclude`: Optional boolean whether to exclude from toggling via Twitch PubSub |

The `status` and `data1` values can be found on the [MIDI.org Messages List](https://midi.org/specifications-old/item/table-2-expanded-messages-list-status-bytes).
Personally I use CC Change on Channel 1, which is `0xB0` or `176d`, but you can technically use whatever you want.

When Sending/Recieving MIDI messages, the *Value*s `0` and `127` represent `Off` and `On` respectively.

## Query Params

There are a few Query Params that if added to the URI will change behavior:

* `username`: [REQUIRED] This is the Twitch channel to listen for PubSub Events
* `rewardTitle`: [Optional] This is the name of the PubSub Reward to listen for and act on. Defaults to `Change My Voice`.
* `debug`: [Optional] Set this to any value to see the instrumented logging output. Useful for errors or seeing what's going on.

