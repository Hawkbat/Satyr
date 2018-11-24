
let convertProject = (function (a, binName) {

	let REGS = {
		SQ0: {
			SWEEP: 0x10,
			LENGTH: 0x11,
			VOLUME: 0x12,
			FREQLO: 0x13,
			FREQHI: 0x14
		},
		SQ1: {
			LENGTH: 0x16,
			VOLUME: 0x17,
			FREQLO: 0x18,
			FREQHI: 0x19
		},
		WAV: {
			ENABLE: 0x1A,
			LENGTH: 0x1B,
			VOLUME: 0x1C,
			FREQLO: 0x1D,
			FREQHI: 0x1E
		},
		NOI: {
			LENGTH: 0x20,
			VOLUME: 0x21,
			FREQLO: 0x22,
			FREQHI: 0x23
		},
		MAIN: {
			VOLUME: 0x24,
			PAN: 0x25,
			ENABLE: 0x26
		}
	}

	REGS[0] = REGS.MAIN
	REGS[1] = REGS.SQ0
	REGS[2] = REGS.SQ1
	REGS[3] = REGS.WAV
	REGS[4] = REGS.NOI

	class NoteArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = a[i++]
			let n = a[i++]
			this.octave = Math.floor(n / 12)
			this.note = NOTE_NAMES[n % 12].charAt(0)
			this.sharp = NOTE_NAMES[n % 12].length > 1
			return i
		}
		toMidiNote() {
			return this.octave * 12 + NOTE_NAMES.indexOf(this.note + (this.sharp ? '#' : ''))
		}
		toAsm() {
			let f = frequencyToGB(midiToFrequency(this.toMidiNote()))
			return [
				REGS[this.channel].FREQLO,
				f & 0xFF,
				REGS[this.channel].FREQHI,
				0x80 + ((f & 0xF00) >>> 8)
			]
		}
		getMasks() { return [0b11111111, 0b11111111] }
		needsRetrigger() { return true }
	}

	class VolumeArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = a[i++]
			this.volume = a[i++]
			return i
		}
		toAsm() { return [REGS[this.channel].VOLUME, this.volume << 4] }
		getMasks() { return [0b11110000] }
		needsRetrigger() { return true }
	}

	class TempoArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 0
			this.tempo = a[i++]
			return i
		}
		toAsm() { return [0xE0, this.tempo] }
		getMasks() { return [0b11111111] }
		needsRetrigger() { return false }
	}

	class LeftVolumeArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 0
			this.volume = a[i++]
			return i
		}
		toAsm() { return [REGS[this.channel].VOLUME, this.volume << 4] }
		getMasks() { return [0b11110000] }
		needsRetrigger() { return false }
	}

	class RightVolumeArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 0
			this.volume = a[i++]
			return i
		}
		toAsm() { return [REGS[this.channel].VOLUME, this.volume] }
		getMasks() { return [0b00001111] }
		needsRetrigger() { return false }
	}

	class PanArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = a[i++]
			this.left = (a[i] & 0xF0) != 0
			this.right = (a[i++] & 0x0F) != 0
			return i
		}
		toAsm() { return [REGS.MAIN.PAN, (this.right ? (1 << (this.channel - 1)) : 0) | (this.left ? (1 << (this.channel + 3)) : 0)] }
		getMasks() { return [(1 << (this.channel - 1)) | (1 << (this.channel + 3))] }
		needsRetrigger() { return false }
	}

	class WaveVolumeArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 3
			this.volume = a[i++]
			return i
		}
		toAsm() { return [REGS[this.channel].VOLUME, this.volume << 5] }
		getMasks() { return [0b01100000] }
		needsRetrigger() { return true }
	}

	class DutyArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = a[i++]
			this.duty = a[i++]
			return i
		}
		toAsm() { return [REGS[this.channel].LENGTH, this.duty << 6] }
		getMasks() { return [0b11000000] }
		needsRetrigger() { return false }
	}

	class NoiseFrequencyArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 4
			this.noise = a[i++]
			return i
		}
		toAsm() {
			return [
				REGS[this.channel].FREQLO,
				this.noise << 4,
				REGS[this.channel].FREQHI,
				0x80
			]
		}
		getMasks() { return [0b11110000, 0b11111111] }
		needsRetrigger() { return true }
	}

	class NoisePatternArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 4
			this.pattern = a[i++]
			return i
		}
		toAsm() { return [REGS[this.channel].FREQLO, this.pattern] }
		getMasks() { return [0b00001111] }
		needsRetrigger() { return false }
	}

	class FrequencySweepArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 1
			let v = a[i++]
			this.time = (v & 0b01110000) >>> 4
			this.dir = (v & 0b00001000) == 0
			this.step = v & 0b00000111
			return i
		}
		toAsm() { return [REGS[this.channel].SWEEP, (this.time << 4) | (this.dir ? 0b00001000 : 0) | this.step] }
		getMasks() { return [0b01111111] }
		needsRetrigger() { return true }
	}

	class VolumeSweepArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = a[i++]
			let v = a[i++]
			this.dir = (v & 0b1000) == 0
			this.sweep = v & 0b0111
			return i
		}
		toAsm() { return [REGS[this.channel].VOLUME, (this.dir ? 0b00001000 : 0) | this.sweep] }
		getMasks() { return [0b00001111] }
		needsRetrigger() { return true }
	}

	class WaveArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = 3
			let v = a[i++]
			this.high = (v & 0xF0) >>> 4
			this.low = v & 0x0F
			return i
		}
		toAsm() {
			let b = []
			let wav = wavs[(this.high << 4) | this.low]
			for (let i = 0; i < 16; i++) {
				b.push(0x30 + i)
				b.push((wav.samples[i * 2 + 0] << 4) | wav.samples[i * 2 + 1])
			}
			return b
		}
		getMasks() { return [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF] }
		needsRetrigger() { return false }
	}

	class FrequencyArg {
		constructor() { }
		deserialize(i, a) {
			this.channel = a[i++]
			this.high = a[i++]
			let v = a[i++]
			this.mid = (v & 0xF0) >>> 4
			this.low = v & 0x0F
			return i
		}
		toAsm() {
			return [
				REGS[this.channel].FREQLO,
				(this.mid << 4) | this.low,
				REGS[this.channel].FREQHI,
				0x80 + this.high
			]
		}
		getMasks() { return [0b11111111, 0b11111111] }
		needsRetrigger() { return true }
	}

	function frequencyToGB(v) { return Math.min(2047, Math.max(0, Math.round(2048 * (v - 64) / v))) }
	function midiToFrequency(v) { return 27.5 * Math.pow(2, (v - 21) / 12) }

	function hex(n) {
		return '$' + n.toString(16).toUpperCase()
	}

	function decodeString(buf, index, len) {
		let s = ''
		for (let i = index; i < index + len; i++) s += String.fromCharCode(buf[i] & 0xFF)
		return s
	}

	let WAV_SIZE = 16

	let VERSION = 1
	let MODES = { GBC: 0 }
	let DATA_FLAGS = { EXPORT: 1, EXPORT2: 2, HAS_BANK: 4 }

	let NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
	let ARG_TYPES = [NoteArg, VolumeArg, null, TempoArg, LeftVolumeArg, RightVolumeArg, PanArg, DutyArg, NoiseFrequencyArg, NoisePatternArg, FrequencySweepArg, VolumeSweepArg, WaveArg, FrequencyArg, WaveVolumeArg]

	let bin = []
	let inc = ''

	let projectName = ""
	let projectMode = MODES.GBC

	let wavs = []
	let seqs = []

	let i = 0
	let len = 0
	let count = 0

	// header
	let version = a[i++]
	if (version != VERSION) return { error: 'Project version not supported; expected ' + VERSION + ' but got ' + version + '. You may need a newer version of this script. Aborting' }
	len = a[i++]
	projectName = decodeString(a, i, len)
	i += len
	projectMode = a[i++]
	if (projectMode != MODES.GBC) return { error: 'Project mode not supported. You may need a newer version of this script. Aborting' }

	// waves
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let wav = { name: '', flags: 0, samples: [] }
		len = a[i++]
		wav.name = decodeString(a, i, len)
		i += len
		wav.flags = a[i++]
		if ((wav.flags & DATA_FLAGS.HAS_BANK) != 0) wav.bank = a[i++]
		for (let k = 0; k < 32; k++) wav.samples.push(a[i++])
		wavs.push(wav)
	}

	// sequences
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let seq = { name: '', flags: 0, frames: [], patterns: [] }
		len = a[i++]
		seq.name = decodeString(a, i, len)
		i += len
		seq.flags = a[i++]
		if ((seq.flags & DATA_FLAGS.HAS_BANK) != 0) seq.bank = a[i++]
		seq.loopStart = a[i++]
		seq.loopEnd = a[i++]

		let count = a[i++]
		for (let k = 0; k < count; k++) {
			let frame = { refs: [] }
			for (let l = 0; l < 5; l++) frame.refs.push({ value: a[i++] })
			seq.frames.push(frame)
		}
		count = a[i++]
		for (let k = 0; k < count; k++) {
			let pat = { name: '', flags: 0, rows: [] }
			len = a[i++]
			pat.name = decodeString(a, i, len)
			i += len
			pat.flags = a[i++]
			if ((pat.flags & DATA_FLAGS.HAS_BANK) != 0) pat.bank = a[i++]
			let count = a[i++]
			for (let l = 0; l < count; l++) {
				let row = { cells: [] }
				for (let m = 0; m < 5; m++) {
					let cell = { args: [] }
					row.cells.push(cell)
				}
				let count = a[i++]
				for (let m = 0; m < count; m++) {
					let typeI = a[i++]
					let type = ARG_TYPES[typeI]
					let arg = new type()
					i = arg.deserialize(i, a)
					row.cells[arg.channel].args.push(arg)
				}
				pat.rows.push(row)
			}
			seq.patterns.push(pat)
		}
		seqs.push(seq)
	}

	inc += ';\n'
	inc += '; Auto-generated file; any changes will be overwritten\n'
	inc += '; Exported from Satyr project "' + projectName + '"\n'
	inc += ';\n'

	let exportedWavs = wavs.filter(wav => (wav.flags & DATA_FLAGS.EXPORT) != 0)

	for (let wav of exportedWavs) {
		let label = wav.name.replace(/\s/g, '')
		inc += '\nsection "Waveform - ' + wav.name + '", romX' + ((wav.flags & DATA_FLAGS.HAS_BANK) != 0 ? ', bank[' + hex(wav.bank) + ']' : '') + '\n'
		inc += 'WAV_' + label + ':: incbin "' + binName + '", ' + hex(bin.length) + ', ' + hex(WAV_SIZE) + '\n'
		for (let j = 0; j < 32; j += 2) {
			bin.push((wav.samples[j + 0] << 4) | wav.samples[j + 1])
		}
		inc += 'WAV_' + label + '_END::\n'
	}

	inc += '\nsection "Waveform Table", romX, align[8]\n'
	inc += 'WAV_TABLE::\n'
	for (let wav of exportedWavs) {
		let label = wav.name.replace(/\s/g, '')
		inc += '\tdw WAV_' + label + '\n'
	}
	inc += 'WAV_TABLE_END::\n'

	let state = []
	for (let j = 0; j < 256; j++) state[j] = 0
	state[REGS.MAIN.VOLUME] = 0x77
	state[REGS.MAIN.PAN] = 0xFF

	for (let seq of seqs) {
		if ((seq.flags & DATA_FLAGS.EXPORT) == 0) continue
		let label = seq.name.replace(/\s/g, '')
		inc += '\nsection "Sequence - ' + seq.name + '", romX' + ((seq.flags & DATA_FLAGS.HAS_BANK) != 0 ? ', bank[' + hex(seq.bank) + ']' : '') + '\n'
		inc += 'SEQ_' + label + ':: incbin "' + binName + '", ' + hex(bin.length)
		let binStart = bin.length
		for (let frame of seq.frames) {
			let rowCount = frame.refs.map(ref => seq.patterns[ref.value].rows.length).reduce((p, c) => Math.max(p, c), 0)
			for (let j = 0; j < rowCount; j++) {
				for (let k = 0; k < 5; k++) {
					let pat = seq.patterns[frame.refs[k].value]
					let row = pat.rows[j % pat.rows.length]
					let args = row.cells[k].args
					let retrigger = false
					for (let arg of args) {
						let asm = arg.toAsm()
						let masks = arg.getMasks()
						if (arg.needsRetrigger()) retrigger = true
						for (let l = 0; l < asm.length; l += 2) {
							let dst = asm[l + 0]
							let val = asm[l + 1]
							let mask = masks[l / 2]
							val = (val & mask) | (state[dst] & ~mask)
							if ((arg instanceof NoteArg || arg instanceof NoiseFrequencyArg || arg instanceof FrequencyArg) && l >= 2) {
								// we can't retrigger a note without clobbering the frequency and thus silencing the channel,
								// so we delay triggering the note until after the effects of all args are processed
							} else {
								bin.push(dst)
								bin.push(val)
							}
							state[dst] = val
						}
					}
					if (retrigger) bin.push(REGS[k].FREQHI, state[REGS[k].FREQHI])
				}
				if (seq.frames.indexOf(frame) == seq.frames.length - 1 && j == rowCount - 1) bin.push(0x00)
				else bin.push(0xFF)
			}
		}
		inc += ', ' + hex(bin.length - binStart) + '\n'
		inc += 'SEQ_' + label + '_END::\n'
	}

	return { project: { projectName, projectMode, wavs, seqs }, bin, inc }
})

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = convertProject