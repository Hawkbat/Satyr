
if (!Element.prototype.scrollIntoViewIfNeeded) {
	Element.prototype.scrollIntoViewIfNeeded = function (centerIfNeeded) {
		function makeRange(start, length) {
			return { "start": start, "length": length, "end": start + length }
		}
		function coverRange(inner, outer) {
			if (false === centerIfNeeded || (outer.start < inner.end && inner.start < outer.end))
				return Math.max(inner.end - outer.length, Math.min(outer.start, inner.start))
			return (inner.start + inner.end - outer.length) / 2;
		}
		function makePoint(x, y) {
			return { "x": x, "y": y, "translate": function translate(dX, dY) { return makePoint(x + dX, y + dY) } }
		}
		function absolute(elem, pt) {
			while (elem) {
				pt = pt.translate(elem.offsetLeft, elem.offsetTop)
				elem = elem.offsetParent
			}
			return pt
		}
		var target = absolute(this, makePoint(0, 0)),
			extent = makePoint(this.offsetWidth, this.offsetHeight),
			elem = this.parentNode,
			origin
		while (elem instanceof HTMLElement) {
			origin = absolute(elem, makePoint(elem.clientLeft, elem.clientTop))
			elem.scrollLeft = coverRange(makeRange(target.x - origin.x, extent.x), makeRange(elem.scrollLeft, elem.clientWidth))
			elem.scrollTop = coverRange(makeRange(target.y - origin.y, extent.y), makeRange(elem.scrollTop, elem.clientHeight))
			target = target.translate(-elem.scrollLeft, -elem.scrollTop)
			elem = elem.parentNode
		}
	}
}

class EmuWrapper {
	constructor() {
		this.channels = {
			square1: {
				freqSweepTime: 0,
				freqSweepDir: 0,
				freqSweepShift: 0,
				duty: 2,
				length: 0,
				volume: 15,
				volumeSweepDir: 0,
				volumeSweepShift: 0,
				frequency: 0
			},
			square2: {
				duty: 2,
				length: 0,
				volume: 15,
				volumeSweepDir: 0,
				volumeSweepShift: 0,
				frequency: 0
			},
			wave: {
				enabled: 1,
				length: 0,
				volume: 1,
				frequency: 0,
				table: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			},
			noise: {
				length: 0,
				volume: 15,
				volumeSweepDir: 0,
				volumeSweepShift: 0,
				frequency: 0,
				width: 0,
				ratio: 0
			}
		}

		this.channelBackup = JSON.stringify(this.channels)

		let ROM = new Uint8Array(32768)
		ROM.set([0xF3, 0xC3, 0x00, 0x01], 0x0100) // disable interrupts and jump to $0100
		ROM.set(new TextEncoder().encode('SATYR EMU'), 0x0134)
		let stringROM = ROM.reduce((p, c) => p + String.fromCharCode(c), '')
		GameBoyCore.start(document.getElementById('emu-canvas'), ROM, stringROM)
		setTimeout(() => this.initialize(), 1000)
	}
	restoreDefaults() {
		this.initialize()
		this.channels = JSON.parse(this.channelBackup)
	}
	triggerSquare1() {
		let c = this.channels.square1
		GameBoyCore.gameboy.memoryWrite(0xFF10, (c.freqSweepTime << 4) | (c.freqSweepDir << 3) | c.freqSweepShift)
		GameBoyCore.gameboy.memoryWrite(0xFF11, (c.duty << 6) | c.length)
		GameBoyCore.gameboy.memoryWrite(0xFF12, (c.volume << 4) | (c.volumeSweepDir << 3) | c.volumeSweepShift)
		GameBoyCore.gameboy.memoryWrite(0xFF13, c.frequency & 0b00011111111)
		GameBoyCore.gameboy.memoryWrite(0xFF14, 0b10000000 | ((c.frequency & 0b11100000000) >>> 8))
	}
	triggerSquare2() {
		let c = this.channels.square2
		GameBoyCore.gameboy.memoryWrite(0xFF16, (c.duty << 6) | c.length)
		GameBoyCore.gameboy.memoryWrite(0xFF17, (c.volume << 4) | (c.volumeSweepDir << 3) | c.volumeSweepShift)
		GameBoyCore.gameboy.memoryWrite(0xFF18, c.frequency & 0b00011111111)
		GameBoyCore.gameboy.memoryWrite(0xFF19, 0b10000000 | ((c.frequency & 0b11100000000) >>> 8))
	}
	triggerWave() {
		let c = this.channels.wave
		for (let i = 0; i < 32; i += 2) {
			GameBoyCore.gameboy.memoryWrite(0xFF30 + i / 2, (c.table[i + 0] << 4) | c.table[i + 1])
		}
		GameBoyCore.gameboy.memoryWrite(0xFF1A, c.enabled << 7)
		GameBoyCore.gameboy.memoryWrite(0xFF1B, c.length)
		GameBoyCore.gameboy.memoryWrite(0xFF1C, c.volume << 5)
		GameBoyCore.gameboy.memoryWrite(0xFF1D, c.frequency & 0b00011111111)
		GameBoyCore.gameboy.memoryWrite(0xFF1E, 0b10000000 | ((c.frequency & 0b11100000000) >>> 8))
	}
	triggerNoise() {
		let c = this.channels.noise
		GameBoyCore.gameboy.memoryWrite(0xFF20, c.length)
		GameBoyCore.gameboy.memoryWrite(0xFF21, (c.volume << 4) | (c.volumeSweepDir << 3) | c.volumeSweepShift)
		GameBoyCore.gameboy.memoryWrite(0xFF22, (c.frequency << 4) | (c.width << 3) | c.ratio)
		GameBoyCore.gameboy.memoryWrite(0xFF23, 0b10000000)
	}
	silenceSquare1() {
		GameBoyCore.gameboy.memoryWrite(0xFF12, 0)
		GameBoyCore.gameboy.memoryWrite(0xFF14, 0b10000000)
	}
	silenceSquare2() {
		GameBoyCore.gameboy.memoryWrite(0xFF17, 0)
		GameBoyCore.gameboy.memoryWrite(0xFF19, 0b10000000)
	}
	silenceWave() {
		GameBoyCore.gameboy.memoryWrite(0xFF1C, 0)
		GameBoyCore.gameboy.memoryWrite(0xFF1E, 0b10000000)
	}
	silenceNoise() {
		GameBoyCore.gameboy.memoryWrite(0xFF21, 0)
		GameBoyCore.gameboy.memoryWrite(0xFF23, 0b10000000)
	}
	silenceAll() {
		this.silenceSquare1()
		this.silenceSquare2()
		this.silenceWave()
		this.silenceNoise()
	}
	initialize() {
		// Main Enable Register
		GameBoyCore.gameboy.memoryWrite(0xFF26, 0x80)
		// Pan Enable Register
		GameBoyCore.gameboy.memoryWrite(0xFF25, 0xFF)
		// Main Volume Register
		GameBoyCore.gameboy.memoryWrite(0xFF24, 0x77)
		// Channel 1 Registers
		GameBoyCore.gameboy.memoryWrite(0xFF10, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF11, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF12, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF13, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF14, 0x00)
		// Channel 2 Registers
		GameBoyCore.gameboy.memoryWrite(0xFF16, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF17, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF18, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF19, 0x00)
		// Channel 3 Registers
		GameBoyCore.gameboy.memoryWrite(0xFF1A, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF1B, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF1C, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF1D, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF1E, 0x00)
		// Channel 4 Registers
		GameBoyCore.gameboy.memoryWrite(0xFF20, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF21, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF22, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF23, 0x00)
		// Wave Table
		GameBoyCore.gameboy.memoryWrite(0xFF30, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF31, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF32, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF33, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF34, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF35, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF36, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF37, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF38, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF39, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF3A, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF3B, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF3C, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF3D, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF3E, 0x00)
		GameBoyCore.gameboy.memoryWrite(0xFF3F, 0x00)
	}
}

class Player {
	constructor() {
		this.prevTime = null
		this.nextTime = null
		this.deltaTime = 0
		this.interval = 1

		this.index = 0
		this.offset = 0
		this.length = 0

		this.playing = false

		this.emu = new EmuWrapper()

		requestAnimationFrame(t => this.update(t))
	}
	getTickInterval() {
		return (1000 / 60) * this.interval
	}
	update(t) {
		if (this.prevTime === null) this.prevTime = t
		this.nextTime = t
		this.deltaTime += this.nextTime - this.prevTime
		this.prevTime = this.nextTime

		if (!this.playing) this.deltaTime = 0

		if (this.deltaTime > this.getTickInterval()) {
			this.deltaTime -= this.getTickInterval()
			this.tick()
		}
		requestAnimationFrame(t => this.update(t))
	}
	tick() {
		let seq = seqs[seqI]
		let frame = seq.frames[this.index]
		this.offset++
		if (this.offset >= this.length) {
			this.index++
			if (this.index >= seq.frames.length) this.index = 0
			frame = seq.frames[this.index]
			this.offset = 0
			this.length = 0
			for (let ref of frame.refs) {
				let pat = seq.patterns[ref.value]
				this.length = Math.max(this.length, pat.rows.length)
			}
		}
		for (let ref of frame.refs) {
			let pat = seq.patterns[ref.value]
			let row = pat.rows[this.offset % pat.rows.length]
			let cell = row.cells[ref.index]
			let willTrigger = false
			for (let arg of cell.args) {
				if (arg.getByteLength() == 0) continue
				if (arg instanceof TempoArg) {
					this.interval = arg.tempo
				}
				if (arg instanceof NoteArg) {
					let f = frequencyToGB(midiToFrequency(arg.toMidiNote()))
					if (arg.channel == 1) this.emu.channels.square1.frequency = f
					if (arg.channel == 2) this.emu.channels.square2.frequency = f
					if (arg.channel == 3) this.emu.channels.wave.frequency = f
					willTrigger = true
				}
				if (arg instanceof NoiseFrequencyArg) {
					this.emu.channels.noise.frequency = arg.noise
					willTrigger = true
				}
				if (arg instanceof VolumeArg) {
					if (arg.channel == 1) this.emu.channels.square1.volume = arg.volume
					if (arg.channel == 2) this.emu.channels.square2.volume = arg.volume
					if (arg.channel == 4) this.emu.channels.noise.volume = arg.volume
					willTrigger = true
				}
				if (arg instanceof WaveVolumeArg) {
					this.emu.channels.wave.volume = arg.volume
					willTrigger = true
				}
				if (arg instanceof WaveArg) {
					let wav = wavs[(arg.high << 4) | arg.low]
					for (let i = 0; i < 32; i++) this.emu.channels.wave.table[i] = wav.samples[i]
					willTrigger = true
				}
				if (arg instanceof NoisePatternArg) {
					this.emu.channels.noise.width = arg.pattern & 0b1000
					this.emu.channels.noise.ratio = arg.pattern & 0b0111
					willTrigger = true
				}
				if (arg instanceof VolumeSweepArg) {
					if (arg.channel == 1) {
						this.emu.channels.square1.volumeSweepDir = arg.dir ? 0 : 1
						this.emu.channels.square1.volumeSweepShift = arg.sweep
					}
					if (arg.channel == 2) {
						this.emu.channels.square2.volumeSweepDir = arg.dir ? 0 : 1
						this.emu.channels.square2.volumeSweepShift = arg.sweep
					}
					if (arg.channel == 4) {
						this.emu.channels.noise.volumeSweepDir = arg.dir ? 0 : 1
						this.emu.channels.noise.volumeSweepShift = arg.sweep
					}
					willTrigger = true
				}
				if (arg instanceof DutyArg) {
					if (arg.channel == 1) this.emu.channels.square1.duty = arg.duty
					if (arg.channel == 2) this.emu.channels.square2.duty = arg.duty
					willTrigger = true
				}
			}
			if (willTrigger) {
				if (cell.index == 1) this.emu.triggerSquare1()
				if (cell.index == 2) this.emu.triggerSquare2()
				if (cell.index == 3) this.emu.triggerWave()
				if (cell.index == 4) this.emu.triggerNoise()
			}
		}
		selectFrame(frame.index)
		selectPattern(frame.refs[refI].value)
		selectRow(this.offset % seq.patterns[frame.refs[refI].value].rows.length)
		selectCell(refI)
		selectArg(0)
	}
	play() {
		this.playing = true
	}
	pause() {
		this.playing = false
		this.emu.silenceAll()
	}
	stop() {
		this.playing = false
		this.index = -1
		this.offset = -1
		this.length = 0
		this.interval = 1
		selectFrame(0)
		selectPattern(seqs[seqI].frames[0].refs[refI].value)
		selectRow(0)
		selectCell(refI)
		selectArg(0)
		this.emu.restoreDefaults()
	}
	isPlaying() {
		return this.playing
	}
	playSquareOneOff(midi) {
		let state = JSON.stringify(this.emu.channels)
		this.emu.restoreDefaults()
		this.emu.channels.square1.frequency = frequencyToGB(midiToFrequency(midi))
		this.emu.triggerSquare1()
		setTimeout(() => {
			this.emu.silenceSquare1()
			this.emu.channels = JSON.parse(state)
		}, 200)
	}
	playWaveOneOff(midi) {
		let state = JSON.stringify(this.emu.channels)
		this.emu.restoreDefaults()
		let samples = wavs[wavI].samples
		for (let i = 0; i < 32; i++) this.emu.channels.wave.table[i] = samples[i]
		this.emu.channels.wave.frequency = frequencyToGB(midiToFrequency(midi))
		this.emu.triggerWave()
		setTimeout(() => {
			this.emu.silenceWave()
			this.emu.channels = JSON.parse(state)
		}, 200)
	}
	playNoiseOneOff(freq) {
		let state = JSON.stringify(this.emu.channels)
		this.emu.restoreDefaults()
		this.emu.channels.noise.frequency = freq
		this.emu.triggerNoise()
		setTimeout(() => {
			this.emu.silenceNoise()
			this.emu.channels = JSON.parse(state)
		}, 200)
	}
}

class Wave {
	constructor(index) {
		this.index = index
		this.name = ''
		this.flags = DATA_FLAGS.EXPORT
		this.bank = -1
		this.samples = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		this.div = document.createElement('div')
		this.div.className = 'wav'
		this.div.addEventListener('click', e => selectWave(this.index))
		this.span = document.createElement('span')
		this.div.appendChild(this.span)
		this.label = document.createElement('label')
		this.div.appendChild(this.label)
		if (index >= wavListEle.children.length) wavListEle.appendChild(this.div)
		else {
			let c = wavListEle.children[index]
			wavListEle.insertBefore(this.div, c)
		}
		this.updateSpan()
		this.updateLabel()
	}
	updateSpan() {
		this.span.textContent = byteToHex(this.index)
	}
	updateLabel() {
		if (this.name) this.label.textContent = this.name
		else this.label.innerHTML = '<i>Untitled</i>'
	}
}

class Sequence {
	constructor(index) {
		this.index = index
		this.name = ''
		this.flags = DATA_FLAGS.EXPORT
		this.bank = -1
		this.patterns = []
		this.frames = []
		this.loopStart = 0
		this.loopEnd = 255
		this.div = document.createElement('div')
		this.div.className = 'seq'
		this.div.addEventListener('click', e => selectSequence(this.index))
		this.span = document.createElement('span')
		this.div.appendChild(this.span)
		this.label = document.createElement('label')
		this.div.appendChild(this.label)
		if (index >= seqListEle.children.length) seqListEle.appendChild(this.div)
		else {
			let c = seqListEle.children[index]
			seqListEle.insertBefore(this.div, c)
		}
		this.updateSpan()
		this.updateLabel()
	}
	updateSpan() {
		this.span.textContent = byteToHex(this.index)
	}
	updateLabel() {
		if (this.name) this.label.textContent = this.name
		else this.label.innerHTML = '<i>Untitled</i>'
	}
}

class Frame {
	constructor(index) {
		this.index = index
		this.refs = []
	}
}

class Reference {
	constructor(index) {
		this.index = index
		this.value = 0
		this.div = null
	}
	updateDiv() {
		if (this.div) this.div.textContent = byteToHex(this.value)
	}
	readKey(k) {
		if (k == 'ArrowLeft' && refI > 0) selectRef(refI - 1)
		if (k == 'ArrowRight' && refI < 5 - 1) selectRef(refI + 1)
		if (k == 'ArrowUp' && frmI > 0) selectFrame(frmI - 1)
		if (k == 'ArrowDown' && frmI < seqs[seqI].frames.length - 1) selectFrame(frmI + 1)

		if (k == 'Backspace') this.value = 0

		if (/^[0-9a-fA-F]$/.test(k)) {
			if (this.digitHandle) {
				this.value = (this.value & 0xF0) + parseInt(k, 16)
				clearTimeout(this.digitHandle)
				delete this.digitHandle
			} else {
				this.value = parseInt(k, 16) * 16
				this.digitHandle = setTimeout(() => {
					delete this.digitHandle
				}, 1000)
			}
		} else {
			if (this.digitHandle) {
				clearTimeout(this.digitHandle)
				delete this.digitHandle
			}
		}
		this.value = clamp(this.value, 0, seqs[seqI].patterns.length - 1)
		this.updateDiv()
	}
}

class Pattern {
	constructor(index) {
		this.index = index
		this.name = ''
		this.flags = DATA_FLAGS.EXPORT
		this.bank = -1
		this.rows = []
		this.div = document.createElement('div')
		this.div.className = 'pat'
		this.div.addEventListener('click', e => selectPattern(this.index))
		this.span = document.createElement('span')
		this.div.appendChild(this.span)
		this.label = document.createElement('label')
		this.div.appendChild(this.label)
		if (index >= patListEle.children.length) patListEle.appendChild(this.div)
		else {
			let c = patListEle.children[index]
			patListEle.insertBefore(this.div, c)
		}
		this.updateSpan()
		this.updateLabel()
	}
	hideDiv() {
		this.div.remove()
	}
	showDiv() {
		if (this.index >= patListEle.children.length) patListEle.appendChild(this.div)
		else {
			let c = patListEle.children[this.index]
			patListEle.insertBefore(this.div, c)
		}
	}
	updateSpan() {
		this.span.textContent = byteToHex(this.index)
	}
	updateLabel() {
		if (this.name) this.label.textContent = this.name
		else this.label.innerHTML = '<i>Untitled</i>'
	}
}

class Row {
	constructor(index) {
		this.index = index
		this.cells = []
	}
}

class Cell {
	constructor(index) {
		this.index = index
		this.args = []
	}
}

class Arg {
	constructor(index, channel) {
		this.index = index
		this.channel = channel
		this.div = null
	}
	updateDiv() {
		if (this.div) this.div.textContent = this.toString()
	}
	toString() {
		return '-'
	}
	readKey(k) {
		let args = seqs[seqI].patterns[patI].rows[rowI].cells[celI].args
		if (k == 'ArrowLeft') {
			if (argI == 0 && celI > 0) {
				selectArg(seqs[seqI].patterns[patI].rows[rowI].cells[celI - 1].args.length - 1)
				selectCell(clamp(celI - 1, 0, 4))
			} else if (argI != 0) {
				selectArg(argI - 1)
			}
		}
		if (k == 'ArrowRight') {
			if (argI == args.length - 1 && celI < 5 - 1) {
				selectArg(0)
				selectCell(clamp(celI + 1, 0, 4))
			} else if (argI != args.length - 1) {
				selectArg(argI + 1)
			}
		}
		let rows = seqs[seqI].patterns[patI].rows
		if (k == 'ArrowUp' && rowI > 0) selectRow(rowI - 1)
		if (k == 'ArrowDown' && rowI < rows.length - 1) selectRow(rowI + 1)
	}
	getByteLength() {
		return 0
	}
	serialize(i, a) {
		return i
	}
	deserialize(i, a) {
		return i
	}
}
Arg.mnemonic = ''

class NoteArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.note = null
		this.sharp = false
		this.octave = null
	}
	toString() {
		return (this.note ? this.note : '-') + (this.sharp ? '#' : '-') + (this.octave ? this.octave : '-')
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[a-gA-G]$/.test(k)) {
			this.note = this.note ? k.toUpperCase() + this.note.substr(1) : k.toUpperCase()
			if (this.note == 'B' || this.note == 'E') this.sharp = false
			if (this.octave === null) {
				this.octave = 5
				if (rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			}
			if (this.channel == 1 || this.channel == 2) player.playSquareOneOff(this.toMidiNote())
			if (this.channel == 3) player.playWaveOneOff(this.toMidiNote())
		}
		if (/^[3-9]$/.test(k)) {
			this.octave = parseInt(k)
			if (this.note === null) {
				this.note = 'C'
				if (rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			}
			if (this.channel == 1 || this.channel == 2) player.playSquareOneOff(this.toMidiNote())
			if (this.channel == 3) player.playWaveOneOff(this.toMidiNote())
		}
		if (k == '-') {
			this.sharp = false
			if (this.note === null) {
				this.note = 'C'
				if (rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			}
			if (this.octave === null) {
				this.octave = 5
				if (rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			}
			if (this.channel == 1 || this.channel == 2) player.playSquareOneOff(this.toMidiNote())
			if (this.channel == 3) player.playWaveOneOff(this.toMidiNote())
		}
		if (k == '#') {
			this.sharp = true
			if (this.note === null) {
				this.note = 'C'
				if (rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			}
			if (this.octave === null) {
				this.octave = 5
				if (rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			}
			if (this.channel == 1 || this.channel == 2) player.playSquareOneOff(this.toMidiNote())
			if (this.channel == 3) player.playWaveOneOff(this.toMidiNote())
		}
		if (k == 'Backspace') {
			this.note = null
			this.sharp = false
			this.octave = null
		}
		this.updateDiv()
	}
	getByteLength() {
		return this.note !== null && this.octive !== null ? 2 : 0
	}
	serialize(i, a) {
		a[i++] = this.channel
		a[i++] = this.toMidiNote()
		return i
	}
	deserialize(i, a) {
		this.channel = a[i++]
		this.fromMidiNote(a[i++])
		return i
	}
	fromMidiNote(n) {
		this.octave = Math.floor(n / 12)
		this.note = NOTE_NAMES[n % 12].charAt(0)
		this.sharp = NOTE_NAMES[n % 12].length > 1
	}
	toMidiNote() {
		return this.octave * 12 + NOTE_NAMES.indexOf(this.note + (this.sharp ? '#' : ''))
	}
}
NoteArg.mnemonic = ''

class VolumeArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.volume = null
	}
	toString() {
		return this.volume !== null ? nybbleToHex(this.volume) : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-9a-fA-F]$/.test(k)) this.volume = parseInt(k, 16)
		if (k == 'Backspace') this.volume = null
		this.updateDiv()
	}
	getByteLength() {
		return this.volume !== null ? 2 : 0
	}
	serialize(i, a) {
		a[i++] = this.channel
		a[i++] = this.volume
		return i
	}
	deserialize(i, a) {
		this.channel = a[i++]
		this.volume = a[i++]
		return i
	}
}
VolumeArg.mnemonic = ''

class EffectArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.effect = null
	}
	toString() {
		return this.effect ? this.effect : ' -'
	}
	tryEffect(k, type) {
		if (k.toUpperCase() != type.mnemonic) return
		let effect = type.mnemonic
		if (this.effect != null) {
			this.effect = effect
			removeArg(this.index + 1)
			insertArg(this.index + 1, type)
		} else {
			this.effect = effect
			insertArg(this.index + 1, EffectArg)
			insertArg(this.index + 1, type)
		}
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (celI == 0) {
			this.tryEffect(k, TempoArg)
			this.tryEffect(k, LeftVolumeArg)
			this.tryEffect(k, RightVolumeArg)
		}
		if (celI == 1) this.tryEffect(k, FrequencySweepArg)
		if (celI == 3) this.tryEffect(k, WaveArg)
		if (celI == 4) this.tryEffect(k, NoisePatternArg)
		if (celI == 1 || celI == 2) this.tryEffect(k, DutyArg)
		if (celI == 1 || celI == 2 || celI == 3) this.tryEffect(k, FrequencyArg)
		if (celI == 1 || celI == 2 || celI == 4) this.tryEffect(k, VolumeSweepArg)
		if (celI == 1 || celI == 2 || celI == 3 || celI == 4) this.tryEffect(k, PanArg)
		if (this.effect != null && k == 'Backspace') {
			this.effect = null
			removeArg(this.index + 1)
			removeArg(this.index)
		}
	}
}
EffectArg.mnemonic = ''

class TempoArg extends Arg {
	constructor(index) {
		super(index, 0)
		this.tempo = null
	}
	toString() {
		return this.tempo !== null ? nybbleToHex(this.tempo) : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-9a-fA-F]$/.test(k)) this.tempo = parseInt(k, 16)
		if (k == 'Backspace') this.tempo = null
		this.updateDiv()
	}
	getByteLength() {
		return this.tempo !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = this.tempo
		return i
	}
	deserialize(i, a) {
		this.tempo = a[i++]
		return i
	}
}
TempoArg.mnemonic = 'T'

class LeftVolumeArg extends Arg {
	constructor(index) {
		super(index, 0)
		this.volume = null
	}
	toString() {
		return this.volume !== null ? nybbleToHex(this.volume) : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-7]$/.test(k)) this.volume = parseInt(k, 16)
		if (k == 'Backspace') this.volume = null
		this.updateDiv()
	}
	getByteLength() {
		return this.volume !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = this.volume
		return i
	}
	deserialize(i, a) {
		this.volume = a[i++]
		return i
	}
}
LeftVolumeArg.mnemonic = 'L'

class RightVolumeArg extends Arg {
	constructor(index) {
		super(index, 0)
		this.volume = null
	}
	toString() {
		return this.volume !== null ? nybbleToHex(this.volume) : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-7]$/.test(k)) this.volume = parseInt(k, 16)
		if (k == 'Backspace') this.volume = null
		this.updateDiv()
	}
	getByteLength() {
		return this.volume !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = this.volume
		return i
	}
	deserialize(i, a) {
		this.volume = a[i++]
		return i
	}
}
RightVolumeArg.mnemonic = 'R'

class PanArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.left = false
		this.right = false
	}
	toString() {
		return (this.left ? 'L' : '-') + (this.right ? 'R' : '-')
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (k.toUpperCase() == 'L') this.left = !this.left
		if (k.toUpperCase() == 'R') this.right = !this.right
		if (k == 'Backspace') {
			this.left = false
			this.right = false
		}
		this.updateDiv()
	}
	getByteLength() {
		return 2
	}
	serialize(i, a) {
		a[i++] = this.channel
		a[i++] = (this.left ? 0xF0 : 0) + (this.right ? 0x0F : 0)
		return i
	}
	deserialize(i, a) {
		this.channel = a[i++]
		this.left = (a[i] & 0xF0) != 0
		this.right = (a[i++] & 0x0F) != 0
		return i
	}
}
PanArg.mnemonic = 'P'

class WaveVolumeArg extends Arg {
	constructor(index) {
		super(index, 3)
		this.volume = null
	}
	toString() {
		return this.volume === 3 ? '1' : this.volume === 2 ? '2' : this.volume === 1 ? '4' : this.volume === 0 ? '0' : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (k == '0') this.volume = 0
		if (k == '4') this.volume = 1
		if (k == '2') this.volume = 2
		if (k == '1') this.volume = 3
		if (k == 'Backspace') this.volume = null
		this.updateDiv()
	}
	getByteLength() {
		return this.volume !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = this.volume
		return i
	}
	deserialize(i, a) {
		this.volume = a[i++]
		return i
	}
}
WaveVolumeArg.mnemonic = ''

class DutyArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.duty = null
	}
	toString() {
		return this.duty === 3 ? '75' : this.duty === 2 ? '50' : this.duty === 1 ? '25' : this.duty === 0 ? '12' : '--'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (k == '1') this.duty = 0
		if (k == '2') this.duty = 1
		if (k == '5') this.duty = 2
		if (k == '7') this.duty = 3
		if (k == 'Backspace') this.duty = null
		this.updateDiv()
	}
	getByteLength() {
		return this.duty !== null ? 2 : 0
	}
	serialize(i, a) {
		a[i++] = this.channel
		a[i++] = this.duty
		return i
	}
	deserialize(i, a) {
		this.channel = a[i++]
		this.duty = a[i++]
		return i
	}
}
DutyArg.mnemonic = 'D'

class NoiseFrequencyArg extends Arg {
	constructor(index) {
		super(index, 4)
		this.noise = null
	}
	toString() {
		return this.noise !== null ? nybbleToHex(this.noise) : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-9a-fA-F]$/.test(k)) {
			this.noise = parseInt(k, 16)
			player.playNoiseOneOff(this.noise)
		}
		if (k == 'Backspace') this.noise = null
		this.updateDiv()
	}
	getByteLength() {
		return this.noise !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = this.noise
		return i
	}
	deserialize(i, a) {
		this.noise = a[i++]
		return i
	}
}
NoiseFrequencyArg.mnemonic = ''

class NoisePatternArg extends Arg {
	constructor(index) {
		super(index, 4)
		this.pattern = null
	}
	toString() {
		return this.pattern !== null ? nybbleToHex(this.pattern) : '-'
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-9a-fA-F]$/.test(k)) this.pattern = parseInt(k, 16)
		if (k == 'Backspace') this.pattern = null
		this.updateDiv()
	}
	getByteLength() {
		return this.pattern !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = this.pattern
		return i
	}
	deserialize(i, a) {
		this.pattern = a[i++]
		return i
	}
}
NoisePatternArg.mnemonic = 'N'

class FrequencySweepArg extends Arg {
	constructor(index) {
		super(index, 1)
		this.time = null
		this.dir = false
		this.step = null
	}
	toString() {
		return (this.time !== null ? nybbleToHex(this.time) : '-') + (this.dir ? '+' : '-') + (this.step !== null ? nybbleToHex(this.step) : '-')
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-7]$/.test(k)) {
			if (this.time === null) this.time = parseInt(k, 16)
			else this.step = parseInt(k, 16)
		}
		if (k == '+') this.dir = true
		if (k == '-') this.dir = false
		if (k == 'Backspace') {
			this.time = null
			this.dir = false
			this.step = null
		}
		this.updateDiv()
	}
	getByteLength() {
		return this.time !== null && this.step !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = (this.time << 4) | ((this.dir ? 0 : 1) << 3) | this.step
		return i
	}
	deserialize(i, a) {
		let v = a[i++]
		this.time = (v & 0b01110000) >>> 4
		this.dir = (v & 0b00001000) == 0
		this.step = v & 0b00000111
		return i
	}
}
FrequencySweepArg.mnemonic = 'S'

class VolumeSweepArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.sweep = null
		this.dir = false
	}
	toString() {
		return (this.dir ? '+' : '-') + (this.sweep ? nybbleToHex(this.sweep) : '-')
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-7]$/.test(k)) this.sweep = parseInt(k, 16)
		if (k == '+') this.dir = true
		if (k == '-') this.dir = false
		if (k == 'Backspace') {
			this.sweep = null
			this.dir = false
		}
		this.updateDiv()
	}
	getByteLength() {
		return this.sweep !== null ? 2 : 0
	}
	serialize(i, a) {
		a[i++] = this.channel
		a[i++] = (this.dir ? 0 : 0b1000) | this.sweep
		return i
	}
	deserialize(i, a) {
		this.channel = a[i++]
		let v = a[i++]
		this.dir = (v & 0b1000) == 0
		this.sweep = v & 0b0111
		return i
	}
}
VolumeSweepArg.mnemonic = 'V'

class WaveArg extends Arg {
	constructor(index) {
		super(index, 3)
		this.high = null
		this.low = null
	}
	toString() {
		return (this.high !== null ? nybbleToHex(this.high) : '-') + (this.low !== null ? nybbleToHex(this.low) : '-')
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-9a-fA-F]$/.test(k)) {
			if (this.high === null) this.high = parseInt(k, 16)
			else this.low = parseInt(k, 16)
		}
		if (k == 'Backspace') {
			this.high = null
			this.low = null
		}
		this.updateDiv()
	}
	getByteLength() {
		return this.high !== null && this.low !== null ? 1 : 0
	}
	serialize(i, a) {
		a[i++] = (this.high << 4) | this.low
		return i
	}
	deserialize(i, a) {
		let v = a[i++]
		this.high = (v & 0xF0) >>> 4
		this.low = v & 0x0F
		return i
	}
}
WaveArg.mnemonic = 'W'

class FrequencyArg extends Arg {
	constructor(index, channel) {
		super(index, channel)
		this.high = null
		this.mid = null
		this.low = null
	}
	toString() {
		return (this.high !== null ? nybbleToHex(this.high) : '-') + (this.mid !== null ? nybbleToHex(this.mid) : '-') + (this.low !== null ? nybbleToHex(this.low) : '-')
	}
	readKey(k) {
		Arg.prototype.readKey.call(this, k)
		if (/^[0-9a-fA-F]$/.test(k)) {
			if (this.high === null) this.high = parseInt(k, 16)
			else if (this.mid === null) this.mid = parseInt(k, 16)
			else this.low = parseInt(k, 16)
		}
		if (k == 'Backspace') {
			this.high = null
			this.mid = null
			this.low = null
		}
		this.updateDiv()
	}
	getByteLength() {
		return this.high !== null && this.mid !== null && this.low !== null ? 3 : 0
	}
	serialize(i, a) {
		a[i++] = this.channel
		a[i++] = this.high
		a[i++] = (this.mid << 4) | this.low
		return i
	}
	deserialize(i, a) {
		this.channel = a[i++]
		this.high = a[i++]
		let v = a[i++]
		this.mid = (v & 0xF0) >>> 4
		this.low = v & 0x0F
		return i
	}
}
FrequencyArg.mnemonic = 'F'

class ContextMenu {
	constructor(parent) {
		this.parent = parent
		parent.addEventListener('click', e => {
			if (!this.isOpen()) {
				if (contextMenu) contextMenu.close()
				this.open()
				e.stopPropagation()
			}
		})
		document.body.addEventListener('click', e => {
			if (this.isOpen()) this.close()
		})
		this.ele = document.createElement('menu')
		let rect = parent.getBoundingClientRect()
		let x = rect.left
		let y = rect.top + rect.height
		this.ele.style.left = `${x}px`
		this.ele.style.top = `${y}px`
	}
	option(label, kbd, cb) {
		let ele = document.createElement('li')
		ele.addEventListener('click', ev => {
			cb()
			this.close()
		})
		window.addEventListener('keydown', ev => {
			if (focus == FOCUS.NONE && ev.target == document.body && ev.key.toLowerCase() == kbd.toLowerCase()) {
				cb()
				this.close()
				ev.preventDefault()
			}
		})
		ele.innerHTML = `<span>${label}</span><span>${kbd}</span>`
		this.ele.appendChild(ele)
		return this
	}
	spacer() {
		this.ele.appendChild(document.createElement('hr'))
		return this
	}
	open() {
		this.parent.classList.add('active')
		document.body.appendChild(this.ele)
		contextMenu = this
		return this
	}
	close() {
		this.parent.classList.remove('active')
		this.ele.remove()
		contextMenu = null
		return this
	}
	isOpen() {
		return this == contextMenu
	}
}

let VERSION = 1
let MODES = { GBC: 0 }
let DATA_FLAGS = { EXPORT: 1, EXPORT2: 2, HAS_BANK: 4 }
let FOCUS = { NONE: 0, SEQUENCE: 1, PATTERN: 2, WAVE: 3 }

let NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
let ARG_TYPES = [NoteArg, VolumeArg, EffectArg, TempoArg, LeftVolumeArg, RightVolumeArg, PanArg, DutyArg, NoiseFrequencyArg, NoisePatternArg, FrequencySweepArg, VolumeSweepArg, WaveArg, FrequencyArg, WaveVolumeArg]

let WAVE_PRESETS = {
	SINE: [
		0x0, 0x0, 0x1, 0x1, 0x2, 0x3, 0x5, 0x6,
		0x7, 0x9, 0xA, 0xC, 0xD, 0xE, 0xE, 0xF,
		0xF, 0xF, 0xE, 0xE, 0xD, 0xC, 0xA, 0x9,
		0x8, 0x6, 0x5, 0x3, 0x2, 0x1, 0x1, 0x0
	],
	SQUARE: [
		0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
		0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
		0xF, 0xF, 0xF, 0xF, 0xF, 0xF, 0xF, 0xF,
		0xF, 0xF, 0xF, 0xF, 0xF, 0xF, 0xF, 0xF,
	],
	SAWTOOTH: [
		0x0, 0x0, 0x1, 0x1, 0x2, 0x2, 0x3, 0x3,
		0x4, 0x4, 0x5, 0x5, 0x6, 0x6, 0x7, 0x7,
		0x8, 0x8, 0x9, 0x9, 0xA, 0xA, 0xB, 0xB,
		0xC, 0xC, 0xD, 0xD, 0xE, 0xE, 0xF, 0xF
	],
	TRIANGLE: [
		0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7,
		0x8, 0x9, 0xA, 0xB, 0xC, 0xD, 0xE, 0xF,
		0xF, 0xE, 0xD, 0xC, 0xB, 0xA, 0x9, 0x8,
		0x7, 0x6, 0x5, 0x4, 0x3, 0x2, 0x1, 0x0
	]
}

let contextMenu = null

let menuFileEle = document.getElementById('menu-file')
let menuEditEle = document.getElementById('menu-edit')
let menuViewEle = document.getElementById('menu-view')
let menuHelpEle = document.getElementById('menu-help')
let sectionHelpEle = document.getElementById('section-help')
let patListEle = document.getElementById('pat-list')
let seqListEle = document.getElementById('seq-list')
let wavListEle = document.getElementById('wav-list')
let patInsertEle = document.getElementById('pat-insert')
let seqInsertEle = document.getElementById('seq-insert')
let wavInsertEle = document.getElementById('wav-insert')
let patRemoveEle = document.getElementById('pat-remove')
let seqRemoveEle = document.getElementById('seq-remove')
let wavRemoveEle = document.getElementById('wav-remove')
let wavCanvasEle = document.getElementById('wav-canvas')
let patGridEle = document.getElementById('pat-grid')
let seqGridEle = document.getElementById('seq-grid')
let patNameEle = document.getElementById('pat-name')
let seqNameEle = document.getElementById('seq-name')
let wavNameEle = document.getElementById('wav-name')
let projectNameEle = document.getElementById('project-name')
let projectModeEle = document.getElementById('project-mode')
let tooltipEle = document.getElementById('tooltip')
let wavTooltipEle = document.getElementById('wav-tooltip')
let patFlagsExportEle = document.getElementById('pat-flags-export')
let seqFlagsExportEle = document.getElementById('seq-flags-export')
let wavFlagsExportEle = document.getElementById('wav-flags-export')
let patLengthEle = document.getElementById('pat-length')
let seqLengthEle = document.getElementById('seq-length')
let wavPresetEle = document.getElementById('wav-preset')
let patBankEle = document.getElementById('pat-bank')
let seqBankEle = document.getElementById('seq-bank')
let wavBankEle = document.getElementById('wav-bank')
let plrPlayEle = document.getElementById('plr-play')
let plrPauseEle = document.getElementById('plr-pause')
let plrStopEle = document.getElementById('plr-stop')
let pianoEle = document.getElementById('piano')

let seqHighlightedEles = []
let patHighlightedEles = []
let seqSelectedEle = null
let patSelectedEle = null

let seqI = 0
let frmI = 0
let refI = 0

let patI = 0
let rowI = 0
let celI = 0
let argI = 0

let wavI = 0

let focus = FOCUS.NONE

let projectName = ""
let projectMode = MODES.GBC
let seqs = []
let wavs = []

let player = new Player()

function clamp(v, min, max) {
	return Math.max(min, Math.min(max, v))
}

function pad(str, char, len, right) {
	str = '' + str
	while (str.length < len) {
		if (right) str = str + char
		else str = char + str
	}
	return str
}

function round(n, d) {
	if (!d) d = 0
	return Math.round(n * Math.pow(10, d)) / Math.pow(10, d)
}

function lerpInt(a, b, t) {
	return Math.round(a + (b - a) * t)
}

function toAscii(s) {
	return s.replace(/[^\x00-\x7F]/g, "")
}

function hexToByte(s) {
	return parseInt(s, 16)
}

function byteToHex(n) {
	return pad(n.toString(16).toUpperCase(), '0', 2)
}

function nybbleToHex(n) {
	return n.toString(16).toUpperCase()
}

function toAscii(s) {
	return s.replace(/[^\x00-\x7F]/g, "")
}

function serializeString(i, a, str) {
	a[i++] = str.length
	a.set(new TextEncoder().encode(str), i)
	i += str.length
	return i
}

function serializeProject() {
	let len = 0
	len += 1 // version
	len += 1 + projectName.length
	len += 1 // project mode
	len += 1 // wave count
	for (let wav of wavs) {
		len += 1 + wav.name.length
		len += 1 // export flags
		if ((wav.flags & DATA_FLAGS.HAS_BANK) != 0) len += 1
		len += 32 // samples
	}
	len += 1 // sequence count
	for (let seq of seqs) {
		len += 1 + seq.name.length
		len += 1 // export flags
		if ((seq.flags & DATA_FLAGS.HAS_BANK) != 0) len += 1
		len += 1 // loop start
		len += 1 // loop end
		len += 1 // frame count
		for (let frame of seq.frames) {
			for (let ref of frame.refs) {
				len += 1 // pattern index
			}
		}
		len += 1 // pattern count
		for (let pattern of seq.patterns) {
			len += 1 + pattern.name.length
			len += 1 // export flags
			if ((pattern.flags & DATA_FLAGS.HAS_BANK) != 0) len += 1
			len += 1 // row count
			for (let row of pattern.rows) {
				len += 1 // arg count
				for (let cell of row.cells) {
					for (let arg of cell.args) {
						if (arg.getByteLength() > 0) {
							len += 1 // arg type
							len += arg.getByteLength()
						}
					}
				}
			}
		}
	}

	let a = new Uint8Array(len)
	let i = 0

	a[i++] = VERSION
	i = serializeString(i, a, projectName)
	a[i++] = projectMode
	a[i++] = wavs.length
	for (let wav of wavs) {
		i = serializeString(i, a, wav.name)
		a[i++] = wav.flags
		if ((wav.flags & DATA_FLAGS.HAS_BANK) != 0) a[i++] = wav.bank
		for (let sample of wav.samples) a[i++] = sample
	}
	a[i++] = seqs.length
	for (let seq of seqs) {
		i = serializeString(i, a, seq.name)
		a[i++] = seq.flags
		if ((seq.flags & DATA_FLAGS.HAS_BANK) != 0) a[i++] = seq.bank
		a[i++] = seq.loopStart
		a[i++] = seq.loopEnd
		a[i++] = seq.frames.length
		for (let frame of seq.frames) {
			for (let ref of frame.refs) {
				a[i++] = ref.value
			}
		}
		a[i++] = seq.patterns.length
		for (let pattern of seq.patterns) {
			i = serializeString(i, a, pattern.name)
			a[i++] = pattern.flags
			if ((pattern.flags & DATA_FLAGS.HAS_BANK) != 0) a[i++] = pattern.bank
			a[i++] = pattern.rows.length
			for (let row of pattern.rows) {
				let countIndex = i++
				let count = 0
				for (let cell of row.cells) {
					for (let arg of cell.args) {
						if (arg.getByteLength() > 0) {
							count++
							a[i++] = ARG_TYPES.indexOf(arg.constructor)
							i = arg.serialize(i, a)
						}
					}
				}
				a[countIndex] = count
			}
		}
	}
	if (i != a.byteLength) alert('Lengths did not match; expected ' + a.byteLength + ' but got ' + i)
	return a
}

function deserializeProject(a) {
	let i = 0
	let len = 0
	let count = 0

	clearProject()

	// header
	let version = a[i++]
	if (version != VERSION) {
		alert('Project version not recognized')
		return
	}
	len = a[i++]
	projectName = new TextDecoder().decode(new DataView(a.buffer, i, len))
	i += len
	projectMode = a[i++]

	// waves
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let wav = new Wave(j)
		len = a[i++]
		wav.name = new TextDecoder().decode(new DataView(a.buffer, i, len))
		i += len
		wav.updateLabel()
		wav.flags = a[i++]
		if ((wav.flags & DATA_FLAGS.HAS_BANK) != 0) wav.bank = a[i++]
		for (let k = 0; k < 32; k++) wav.samples[k] = a[i++]
		wavs.push(wav)
	}

	// sequences
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let seq = new Sequence(j)
		len = a[i++]
		seq.name = new TextDecoder().decode(new DataView(a.buffer, i, len))
		i += len
		seq.updateLabel()
		seq.flags = a[i++]
		if ((seq.flags & DATA_FLAGS.HAS_BANK) != 0) seq.bank = a[i++]
		seq.loopStart = a[i++]
		seq.loopEnd = a[i++]
		let count = a[i++]
		for (let k = 0; k < count; k++) {
			let frame = new Frame(k)
			for (let l = 0; l < 5; l++) {
				let ref = new Reference(l)
				ref.value = a[i++]
				frame.refs[l] = ref
			}
			seq.frames.push(frame)
		}
		count = a[i++]
		for (let k = 0; k < count; k++) {
			let pat = new Pattern(k)
			len = a[i++]
			pat.name = new TextDecoder().decode(new DataView(a.buffer, i, len))
			i += len
			pat.updateLabel()
			pat.flags = a[i++]
			if ((pat.flags & DATA_FLAGS.HAS_BANK) != 0) pat.bank = a[i++]
			let count = a[i++]
			for (let l = 0; l < count; l++) {
				let row = new Row(l)
				for (let m = 0; m < 5; m++) {
					let cell = new Cell(m)
					if (m != 0) {
						if (m == 4) cell.args.push(new NoiseFrequencyArg(0))
						else cell.args.push(new NoteArg(0, m))
						if (m == 3) cell.args.push(new WaveVolumeArg(1))
						else cell.args.push(new VolumeArg(1, m))
					}
					row.cells.push(cell)
				}
				let count = a[i++]
				for (let m = 0; m < count; m++) {
					let typeI = a[i++]
					let type = ARG_TYPES[typeI]
					let arg = new type(0, 0)
					i = arg.deserialize(i, a)
					if (arg instanceof NoteArg || arg instanceof NoiseFrequencyArg) {
						arg.index = 0
						row.cells[arg.channel].args[0] = arg
					} else if (arg instanceof VolumeArg || arg instanceof WaveVolumeArg) {
						arg.index = 1
						row.cells[arg.channel].args[1] = arg
					} else {
						let effectArg = new EffectArg(row.cells[arg.channel].args.length, arg.channel)
						effectArg.effect = type.mnemonic
						row.cells[arg.channel].args.push(effectArg)
						arg.index = row.cells[arg.channel].args.length
						row.cells[arg.channel].args.push(arg)
					}
				}
				for (let m = 0; m < 5; m++) {
					row.cells[m].args.push(new EffectArg(row.cells[m].args.length, m))
				}
				pat.rows.push(row)
			}
			seq.patterns.push(pat)
		}
		seqs.push(seq)
	}

	refreshProject()

	if (i != a.byteLength) alert('Lengths did not match; expected ' + a.byteLength + ' but got ' + i)
}

function clearProject() {
	projectName = ''
	projectMode = MODES.GBC
	for (let wav of wavs) wav.div.remove()
	wavs = []
	for (let seq of seqs) {
		for (let pat of seq.patterns) pat.div.remove()
		seq.div.remove()
	}
	seqs = []

	seqI = 0
	frmI = 0
	refI = 0
	patI = 0
	rowI = 0
	celI = 0
	argI = 0
	wavI = 0
}

function refreshProject() {
	projectNameEle.value = projectName
	projectModeEle.value = projectMode

	selectWave(wavI, true)
	selectSequence(seqI, true)
	selectFrame(frmI, true)
	selectRef(refI, true)
	selectPattern(patI, true)
	selectRow(rowI, true)
	selectCell(celI, true)
	selectArg(argI, true)
}

let _patternGridHandle = null

function updatePatternGrid() {
	if (_patternGridHandle) clearTimeout(_patternGridHandle)
	_patternGridHandle = setTimeout(rebuildPatternGrid, 0)
}

function rebuildPatternGrid() {
	patHighlightedEles = []
	patSelectedEle = null

	patGridEle.innerHTML = `<i class="head"></i><i class="head">System</i><i class="head">Square 1</i><i class="head">Square 2</i><i class="head">Waveform</i><i class="head">Noise</i>`
	let rows = seqs[seqI].patterns[patI].rows
	for (let i = 0; i < rows.length; i++) {
		let lineDiv = document.createElement('i')
		lineDiv.classList.add('line')
		lineDiv.textContent = byteToHex(i)
		patGridEle.appendChild(lineDiv)
		for (let j = 0; j < rows[i].cells.length; j++) {
			let cell = document.createElement('i')
			if (i == rowI) {
				cell.classList.add('highlighted')
				patHighlightedEles.push(cell)
			}
			for (let k = 0; k < rows[i].cells[j].args.length; k++) {
				let arg = document.createElement('b')
				if (i == rowI && j == celI && k == argI) {
					arg.classList.add('selected')
					patSelectedEle = arg
				}

				if (j > 0 && k == 0) arg.classList.add('note')
				else if (j > 0 && k == 1) arg.classList.add('volume')
				else arg.classList.add('fx')

				rows[i].cells[j].args[k].div = arg
				rows[i].cells[j].args[k].updateDiv()

				let rowIndex = i
				let celIndex = j
				let argIndex = k
				function onMouse(e) {
					if (e.buttons & 1) {
						selectRow(rowIndex)
						selectCell(celIndex)
						selectArg(argIndex)
					}
				}
				arg.addEventListener('mouseover', e => onMouse(e))
				arg.addEventListener('mousedown', e => onMouse(e))
				cell.appendChild(arg)
			}
			patGridEle.appendChild(cell)
		}
	}
}

let _sequenceGridHandle = null

function updateSequenceGrid() {
	if (_sequenceGridHandle) clearTimeout(_sequenceGridHandle)
	_sequenceGridHandle = setTimeout(rebuildSequenceGrid, 0)
}

function rebuildSequenceGrid() {
	seqHighlightedEles = []
	seqSelectedEle = null

	seqGridEle.innerHTML = `<i class="head"></i><i class="head">SYS</i><i class="head">SQ1</i><i class="head">SQ2</i><i class="head">WAV</i><i class="head">NOI</i>`
	let frames = seqs[seqI].frames
	for (let i = 0; i < frames.length; i++) {
		let lineDiv = document.createElement('i')
		lineDiv.classList.add('line')
		lineDiv.textContent = byteToHex(i)
		seqGridEle.appendChild(lineDiv)
		for (let j = 0; j < frames[i].refs.length; j++) {
			let cell = document.createElement('i')
			if (i == frmI) {
				cell.classList.add('highlighted')
				seqHighlightedEles.push(cell)
			}

			let ref = document.createElement('b')
			if (i == frmI && j == refI) {
				ref.classList.add('selected')
				seqSelectedEle = ref
			}

			frames[i].refs[j].div = ref
			frames[i].refs[j].updateDiv()

			cell.appendChild(ref)

			let frameIndex = i
			let refIndex = j
			function onMouse(e) {
				if (e.buttons & 1) {
					selectFrame(frameIndex)
					selectRef(refIndex)
				}
			}
			cell.addEventListener('mouseover', e => onMouse(e))
			cell.addEventListener('mousedown', e => onMouse(e))
			seqGridEle.appendChild(cell)
		}
	}
}

let _waveCanvasHandle = null

function updateWaveCanvas() {
	if (_waveCanvasHandle) clearTimeout(_waveCanvasHandle)
	_waveCanvasHandle = setTimeout(redrawWaveCanvas, 0)
}

function redrawWaveCanvas() {
	let ctx = wavCanvasEle.getContext('2d')
	let imgData = ctx.getImageData(0, 0, 32, 16)
	let data = new Uint32Array(imgData.data.buffer)
	for (let x = 0; x < 32; x++) {
		for (let y = 0; y < 16; y++) {
			let i = y * 32 + x
			data[i] = wavs[wavI].samples[x] >= (15 - y) ? 0xffffcf00 : 0xff000000
		}
	}
	ctx.putImageData(imgData, 0, 0)
}

function removeArg(index) {
	let args = seqs[seqI].patterns[patI].rows[rowI].cells[celI].args
	args.splice(index, 1)
	for (let i = args.length - 1; i >= index; i--) args[i].index = i
	updatePatternGrid()
	selectArg(index - 1, true)
}

function removeRow(index) {
	let rows = seqs[seqI].patterns[patI].rows
	if (rows.length == 1) return
	rows.splice(index, 1)
	for (let i = rows.length - 1; i >= index; i--) rows[i].index = i
	updatePatternGrid()
	selectRow(index - 1, true)
}

function removePattern(index) {
	let pats = seqs[seqI].patterns
	if (pats.length == 1) return
	pats[index].div.remove()
	pats.splice(index, 1)
	for (let i = index; i < pats.length; i++) {
		for (let frame of seqs[seqI].frames) {
			for (let ref of frame.refs) {
				let update = true
				if (ref.value >= pats.length) ref.value = pats.length - 1
				else if (ref.value == pats[i].index) ref.value = i
				else update = false
				if (update) ref.updateDiv()
			}
		}
		pats[i].index = i
		pats[i].updateSpan()
	}
	selectPattern(clamp(patI, 0, pats.length - 1), true)
}

function removeFrame(index) {
	let frames = seqs[seqI].frames
	frames.splice(index, 1)
	for (let i = frames.length - 1; i >= index; i--) frames[i].index = i
	updateSequenceGrid()
	selectFrame(index - 1, true)
}

function removeSequence(index) {
	if (seqs.length == 1) return
	for (let pat of seqs[index].patterns) pat.hideDiv()
	seqs[index].div.remove()
	seqs.splice(index, 1)
	for (let i = seqs.length - 1; i >= index; i--) {
		seqs[i].index = i
		seqs[i].updateSpan()
	}
	selectSequence(clamp(seqI, 0, seqs.length - 1), true)
}

function removeWave(index) {
	if (wavs.length == 1) return
	wavs[index].div.remove()
	wavs.splice(index, 1)
	for (let i = wavs.length - 1; i >= index; i--) {
		wavs[i].index = i
		wavs[i].updateSpan()
	}
	selectWave(clamp(wavI, 0, wavs.length - 1), true)
}

function insertArg(index, type) {
	let args = seqs[seqI].patterns[patI].rows[rowI].cells[celI].args
	let arg = new type(index, celI)
	args.splice(index, 0, arg)
	for (let i = args.length - 1; i > index; i--) args[i].index = i
	updatePatternGrid()
	selectArg(index, true)
}

function insertCell(index) {
	let cells = seqs[seqI].patterns[patI].rows[rowI].cells
	let cell = new Cell(index)
	cells.splice(index, 0, cell)
	for (let i = cells.length - 1; i > index; i--) cells[i].index = i
	celI = index
	if (celI == 0) {
		insertArg(0, EffectArg)
	} else {
		if (celI == 4) insertArg(0, NoiseFrequencyArg)
		else insertArg(0, NoteArg)
		if (celI == 3) insertArg(1, WaveVolumeArg)
		else insertArg(1, VolumeArg)
		insertArg(2, EffectArg)
	}
	selectCell(index, true)
}

function insertRow(index) {
	let rows = seqs[seqI].patterns[patI].rows
	let row = new Row(index)
	rows.splice(index, 0, row)
	for (let i = rows.length - 1; i > index; i--) rows[i].index = i
	rowI = index
	for (let i = 0; i < 5; i++) insertCell(i)
	selectRow(index, true)
}

function insertPattern(index) {
	let pats = seqs[seqI].patterns

	let rowCount = pats.length ? (pats[clamp(patI, 0, pats.length - 1)].rows.length) : 32

	let pat = new Pattern(index)
	pats.splice(index, 0, pat)
	for (let i = pats.length - 1; i > index; i--) {
		pats[i].index = i
		pats[i].updateSpan()
	}
	patI = index
	for (let i = 0; i < rowCount; i++) insertRow(i)
	selectPattern(index, true)
}

function insertRef(index) {
	let refs = seqs[seqI].frames[frmI].refs
	let ref = new Reference(index)
	refs.splice(index, 0, ref)
	for (let i = refs.length - 1; i > index; i--) refs[i].index = i
	refI = index
	updateSequenceGrid()
	selectRef(index, true)
}

function insertFrame(index) {
	let frames = seqs[seqI].frames
	let frame = new Frame(index)
	frames.splice(index, 0, frame)
	for (let i = frames.length - 1; i > index; i--) frames[i].index = i
	frmI = index
	for (let i = 0; i < 5; i++) insertRef(i)
	selectFrame(index, true)
}

function insertSequence(index) {
	if (seqs.length == 256) return
	let seq = new Sequence(index)
	seqs.splice(index, 0, seq)
	for (let i = seqs.length - 1; i > index; i--) {
		seqs[i].index = i
		seqs[i].updateSpan()
	}
	for (let pat of seqs[seqI].patterns) pat.hideDiv()
	seqI = index
	insertPattern(0)
	insertFrame(0)
	selectSequence(index, true)
	selectFrame(0)
	selectRef(0)
	selectRow(0)
	selectCell(0)
	selectArg(0)
}

function insertWave(index) {
	if (wavs.length == 256) return
	let wav = new Wave(index)
	wavs.splice(index, 0, wav)
	for (let i = wavs.length - 1; i > index; i--) {
		wavs[i].index = i
		wavs[i].updateSpan()
	}
	wavI = index
	selectWave(index, true)
}

let _selectArgHandle = null
let _selectArgIndex = 0

function selectArg(index, force) {
	argI = index
	if (_selectArgHandle) clearTimeout(_selectArgHandle)
	_selectArgHandle = setTimeout(doSelectArg, 0, index, force)
}

function doSelectArg(index, force) {
	if (_selectArgIndex == index && !force) return
	_selectArgIndex = index
	let args = seqs[seqI].patterns[patI].rows[rowI].cells[celI].args
	index = clamp(index, 0, args.length - 1)
	if (patSelectedEle) patSelectedEle.classList.remove('selected')
	patSelectedEle = document.querySelector(`#pat-grid i:nth-child(${8 + rowI * 6 + celI}) b:nth-child(${1 + index})`)
	if (patSelectedEle) patSelectedEle.classList.add('selected')
	setFocus(FOCUS.PATTERN)
}

let _selectCellHandle = null
let _selectCellIndex = 0

function selectCell(index, force) {
	celI = index
	if (_selectCellHandle) clearTimeout(_selectCellHandle)
	_selectCellHandle = setTimeout(doSelectCell, 0, index, force)
}

function doSelectCell(index, force) {
	if (_selectCellIndex == index && !force) return
	_selectCellIndex = index
	selectArg(argI, true)
}

let _selectRowHandle = null
let _selectRowIndex = 0

function selectRow(index, force) {
	rowI = index
	if (_selectRowHandle) clearTimeout(_selectRowHandle)
	_selectRowHandle = setTimeout(doSelectRow, 0, index, force)
}

function doSelectRow(index, force) {
	if (_selectRowIndex == index && !force) return
	_selectRowIndex = index
	while (patHighlightedEles.length) patHighlightedEles.pop().classList.remove('highlighted')
	patHighlightedEles = []
	for (let i = 0; i < 6; i++) {
		let ele = document.querySelector(`#pat-grid i:nth-child(${7 + index * 6 + i})`)
		if (ele) {
			ele.classList.add('highlighted')
			patHighlightedEles.push(ele)
		}
	}
	selectCell(celI, true)
}

let _selectPatternHandle = null
let _selectPatternIndex = 0

function selectPattern(index, force) {
	patI = index
	if (_selectPatternHandle) clearTimeout(_selectPatternHandle)
	_selectPatternHandle = setTimeout(doSelectPattern, 0, index, force)
}

function doSelectPattern(index, force) {
	if (_selectPatternIndex == index && !force) return
	_selectPatternIndex = index
	let pats = seqs[seqI].patterns
	for (let ele of document.querySelectorAll('.pat.selected')) ele.classList.remove('selected')
	if (index >= 0 && index < pats.length) {
		pats[index].div.classList.add('selected')
		patNameEle.value = pats[index].name
		patFlagsExportEle.checked = (pats[index].flags & DATA_FLAGS.EXPORT) != 0
		patBankEle.value = (pats[index].flags & DATA_FLAGS.HAS_BANK) != 0 ? pats[index].bank : -1
		patLengthEle.value = pats[index].rows.length
	}
	selectRow(0)
	updatePatternGrid()
}

let _selectRefHandle = null
let _selectRefIndex = 0

function selectRef(index, force) {
	refI = index
	if (_selectRefHandle) clearTimeout(_selectRefHandle)
	_selectRefHandle = setTimeout(doSelectRef, 0, index, force)
}

function doSelectRef(index, force) {
	if (_selectRefIndex == index && !force) return
	_selectRefIndex = index
	if (seqSelectedEle) seqSelectedEle.classList.remove('selected')
	seqSelectedEle = document.querySelector(`#seq-grid i:nth-child(${8 + frmI * 6 + index}) b`)
	if (seqSelectedEle) seqSelectedEle.classList.add('selected')
	selectPattern(seqs[seqI].frames[frmI].refs[index].value)
	setFocus(FOCUS.SEQUENCE)
}

let _selectFrameHandle = null
let _selectFrameIndex = 0

function selectFrame(index, force) {
	frmI = index
	if (_selectFrameHandle) clearTimeout(_selectFrameHandle)
	_selectFrameHandle = setTimeout(doSelectFrame, 0, index, force)
}

function doSelectFrame(index, force) {
	if (_selectFrameIndex == index && !force) return
	_selectFrameIndex = index
	while (seqHighlightedEles.length) seqHighlightedEles.pop().classList.remove('highlighted')
	for (let i = 0; i < 6; i++) {
		let ele = document.querySelector(`#seq-grid i:nth-child(${7 + index * 6 + i})`)
		if (ele) {
			ele.classList.add('highlighted')
			seqHighlightedEles.push(ele)
		}
	}
	selectRef(refI, true)
}

let _selectSequenceHandle = null
let _selectSequenceIndex = 0

function selectSequence(index, force) {
	seqI = index
	if (_selectSequenceHandle) clearTimeout(_selectSequenceHandle)
	_selectSequenceHandle = setTimeout(doSelectSequence, 0, index, force)
}

function doSelectSequence(index, force) {
	if (_selectSequenceIndex == index && !force) return
	for (let ele of document.querySelectorAll('.seq.selected')) ele.classList.remove('selected')
	if (index >= 0 && index < seqs.length) {
		seqs[index].div.classList.add('selected')
		seqNameEle.value = seqs[index].name
		seqFlagsExportEle.checked = (seqs[index].flags & DATA_FLAGS.EXPORT) != 0
		seqBankEle.value = (seqs[index].flags & DATA_FLAGS.HAS_BANK) != 0 ? seqs[index].bank : -1
		seqLengthEle.value = seqs[index].frames.length
	}
	if (seqs[_selectSequenceIndex]) {
		for (let pat of seqs[_selectSequenceIndex].patterns) pat.hideDiv()
	}
	_selectSequenceIndex = index
	for (let pat of seqs[index].patterns) pat.showDiv()
	selectPattern(0, true)
	updateSequenceGrid()
}

let _selectWaveHandle = null
let _selectWaveIndex = 0

function selectWave(index, force) {
	wavI = index
	if (_selectWaveHandle) clearTimeout(_selectWaveHandle)
	_selectWaveHandle = setTimeout(doSelectWave, 0, index, force)
}

function doSelectWave(index, force) {
	if (_selectWaveIndex == index && !force) return
	_selectWaveIndex = index
	for (let ele of document.querySelectorAll('.wav.selected')) ele.classList.remove('selected')
	if (index >= 0 && index < wavs.length) {
		wavs[index].div.classList.add('selected')
		wavNameEle.value = wavs[index].name
		wavFlagsExportEle.checked = (wavs[index].flags & DATA_FLAGS.EXPORT) != 0
		wavBankEle.value = (wavs[index].flags & DATA_FLAGS.HAS_BANK) != 0 ? wavs[index].bank : -1
	}
	updateWaveCanvas()
}

function setWaveSample(index, value) {
	wavs[wavI].samples[index] = value
	updateWaveCanvas()
}

function setWaveSamples(arr) {
	for (let i = 0; i < 32; i++) wavs[wavI].samples[i] = arr[i]
	updateWaveCanvas()
}

function setWavePreset(preset) {
	if (WAVE_PRESETS[preset]) setWaveSamples(WAVE_PRESETS[preset])
	wavPresetEle.value = ''
}

function setPatternName(s) {
	seqs[seqI].patterns[patI].name = toAscii(s)
	seqs[seqI].patterns[patI].updateLabel()
	patNameEle.value = seqs[seqI].patterns[patI].name
}

function setSequenceName(s) {
	seqs[seqI].name = toAscii(s)
	seqs[seqI].updateLabel()
	seqNameEle.value = seqs[seqI].name
}

function setWaveName(s) {
	wavs[wavI].name = toAscii(s)
	wavs[wavI].updateLabel()
	wavNameEle.value = wavs[wavI].name
}

function setProjectName(s) {
	projectName = toAscii(s)
	projectNameEle.value = projectName
}

function setPatternExport(b) {
	if (b) seqs[seqI].patterns[patI].flags |= DATA_FLAGS.EXPORT
	else seqs[seqI].patterns[patI].flags &= ~DATA_FLAGS.EXPORT
	patFlagsExportEle.checked = (seqs[seqI].patterns[patI].flags & DATA_FLAGS.EXPORT) != 0
}

function setSequenceExport(b) {
	if (b) seqs[seqI].flags |= DATA_FLAGS.EXPORT
	else seqs[seqI].flags &= ~DATA_FLAGS.EXPORT
	seqFlagsExportEle.checked = (seqs[seqI].flags & DATA_FLAGS.EXPORT) != 0
}

function setWaveExport(b) {
	if (b) wavs[wavI].flags |= DATA_FLAGS.EXPORT
	else wavs[wavI].flags &= ~DATA_FLAGS.EXPORT
	wavFlagsExportEle.checked = (wavs[wavI].flags & DATA_FLAGS.EXPORT) != 0
}

function setPatternBank(v) {
	seqs[seqI].patterns[patI].bank = v
	if (v >= 0) seqs[seqI].patterns[patI].flags |= DATA_FLAGS.HAS_BANK
	else seqs[seqI].patterns[patI].flags &= ~DATA_FLAGS.HAS_BANK
	patBankEle.value = v
}

function setSequenceBank(v) {
	seqs[seqI].bank = v
	if (v >= 0) seqs[seqI].flags |= DATA_FLAGS.HAS_BANK
	else seqs[seqI].flags &= ~DATA_FLAGS.HAS_BANK
	seqBankEle.value = v
}

function setWaveBank(v) {
	wavs[wavI].bank = v
	if (v >= 0) wavs[wavI].flags |= DATA_FLAGS.HAS_BANK
	else wavs[wavI].flags &= ~DATA_FLAGS.HAS_BANK
	wavBankEle.value = v
}

function setPatternLength(v) {
	let rows = seqs[seqI].patterns[patI].rows
	while (rows.length > v) removeRow(rows.length - 1)
	while (rows.length < v) insertRow(rows.length)
	patLengthEle.value = v
}

function setSequenceLength(v) {
	let frames = seqs[seqI].frames
	while (frames.length > v) removeFrame(frames.length - 1)
	while (frames.length < v) insertFrame(frames.length)
	seqLengthEle.value = v
}

function setFocus(f) {
	focus = f
	if (f == FOCUS.SEQUENCE) seqGridEle.classList.add('focused')
	else seqGridEle.classList.remove('focused')
	if (f == FOCUS.PATTERN) patGridEle.classList.add('focused')
	else patGridEle.classList.remove('focused')
	if (f == FOCUS.WAVE) wavCanvasEle.classList.add('focused')
	else wavCanvasEle.classList.remove('focused')

	if (f == FOCUS.SEQUENCE) {
		let ref = seqs[seqI].frames[frmI].refs[refI]
		if (ref.div) ref.div.scrollIntoViewIfNeeded(false)
	}
	if (f == FOCUS.PATTERN) {
		let arg = seqs[seqI].patterns[patI].rows[rowI].cells[celI].args[argI]
		if (arg.div) arg.div.scrollIntoViewIfNeeded(false)
	}
	if (document.activeElement) document.activeElement.blur()
}

for (let i = 36; i < 120; i++) {
	let ele = document.createElement(NOTE_NAMES[i % 12].length > 1 ? 'b' : 'i')
	let midi = i
	let note = NOTE_NAMES[i % 12].charAt(0)
	let sharp = NOTE_NAMES[i % 12].length > 1
	let octave = Math.floor(i / 12)
	ele.title = NOTE_NAMES[i % 12] + octave
	ele.addEventListener('mousedown', e => {
		if (celI == 1 || celI == 2 || celI == 3) {
			let arg = seqs[seqI].patterns[patI].rows[rowI].cells[celI].args[0]
			if (arg.getByteLength() == 0 && rowI < seqs[seqI].patterns[patI].rows.length - 1) selectRow(rowI + 1)
			arg.note = note
			arg.sharp = sharp
			arg.octave = octave
			arg.updateDiv()
			setFocus(FOCUS.PATTERN)
			e.preventDefault()
			e.stopPropagation()
		}
		player.playSquareOneOff(midi)
	})
	pianoEle.appendChild(ele)
}

document.body.addEventListener('keydown', e => {
	if (e.target == document.body) {
		if (focus == FOCUS.PATTERN) {
			seqs[seqI].patterns[patI].rows[rowI].cells[celI].args[argI].readKey(e.key)
		} else if (focus == FOCUS.SEQUENCE) {
			seqs[seqI].frames[frmI].refs[refI].readKey(e.key)
		}
		if (focus != FOCUS.NONE) {
			if (e.key == 'ArrowLeft' || e.key == 'ArrowRight' || e.key == 'ArrowUp' || e.key == 'ArrowDown') {
				e.preventDefault()
			}
		}
	}
})

seqGridEle.addEventListener('mousedown', e => {
	setFocus(FOCUS.SEQUENCE)
	e.preventDefault()
	e.stopPropagation()
})

patGridEle.addEventListener('mousedown', e => {
	setFocus(FOCUS.PATTERN)
	e.preventDefault()
	e.stopPropagation()
})

document.body.addEventListener('mousedown', e => {
	setFocus(FOCUS.NONE)
})

patInsertEle.addEventListener('click', e => insertPattern(patI + 1))
seqInsertEle.addEventListener('click', e => insertSequence(seqI + 1))
wavInsertEle.addEventListener('click', e => insertWave(wavI + 1))
patRemoveEle.addEventListener('click', e => removePattern(patI))
seqRemoveEle.addEventListener('click', e => removeSequence(seqI))
wavRemoveEle.addEventListener('click', e => removeWave(wavI))

patNameEle.addEventListener('input', e => setPatternName(e.target.value))
seqNameEle.addEventListener('input', e => setSequenceName(e.target.value))
wavNameEle.addEventListener('input', e => setWaveName(e.target.value))
projectNameEle.addEventListener('input', e => setProjectName(e.target.value))

patFlagsExportEle.addEventListener('change', e => setPatternExport(e.target.checked))
seqFlagsExportEle.addEventListener('change', e => setSequenceExport(e.target.checked))
wavFlagsExportEle.addEventListener('change', e => setWaveExport(e.target.checked))

patBankEle.addEventListener('change', e => setPatternBank(e.target.value))
seqBankEle.addEventListener('change', e => setSequenceBank(e.target.value))
wavBankEle.addEventListener('change', e => setWaveBank(e.target.value))

patLengthEle.addEventListener('change', e => setPatternLength(e.target.value))
seqLengthEle.addEventListener('change', e => setSequenceLength(e.target.value))

wavPresetEle.addEventListener('change', e => setWavePreset(e.target.value))

function onWavMouseEvt(e) {
	let x = clamp(Math.floor(e.offsetX / 8), 0, 31)
	let y = clamp(Math.floor(e.offsetY / 8), 0, 15)
	if (e.buttons & 1) {
		setWaveSample(x, 15 - y)
	}
	wavTooltipEle.textContent = 'Cursor: $' + byteToHex(x) + ', $' + nybbleToHex(15 - y) + '\nValue: $' + nybbleToHex(wavs[wavI].samples[x])
}
wavCanvasEle.addEventListener('mousedown', e => onWavMouseEvt(e))
wavCanvasEle.addEventListener('mousemove', e => onWavMouseEvt(e))

plrPlayEle.addEventListener('click', e => player.play())
plrPauseEle.addEventListener('click', e => player.pause())
plrStopEle.addEventListener('click', e => player.stop())

insertSequence(0)
insertWave(0)

new ContextMenu(menuFileEle).option('New Project', 'N', () => {
	clearProject()
	insertSequence(0)
	insertWave(0)
}).option('Open Project...', 'O', () => {
	let input = document.createElement('input')
	input.type = 'file'
	input.onchange = () => {
		let file = input.files[0]
		if (file) {
			let reader = new FileReader()
			reader.readAsArrayBuffer(file)
			reader.onload = (evt) => {
				let data = new Uint8Array(reader.result)
				deserializeProject(data)
			}
		}
	}
	document.body.appendChild(input)
	input.click()
	input.remove()
}).option('Save Project...', 'S', () => {
	let data = serializeProject()
	let blob = new Blob([data.buffer], { type: 'application/octet-stream' })
	let objUrl = URL.createObjectURL(blob)
	let a = document.createElement('a')
	a.href = objUrl
	a.target = '_blank'
	a.setAttribute('download', projectName.replace(/\s+/g, '-') + '.satyr-project')
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(objUrl)
}).spacer().option('Export to ASM...', 'E', () => {
	let { error, bin, inc } = convertProject(serializeProject())
	if (error) {
		alert(error)
		return
	}
	let buf = new Uint8Array(bin)
	let blob = new Blob([buf.buffer], { type: 'application/octet-stream' })
	let objUrl = URL.createObjectURL(blob)
	let a = document.createElement('a')
	a.href = objUrl
	a.setAttribute('download', projectName.replace(/\s+/g, '-') + '.bin')
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(objUrl)
	a = document.createElement('a')
	a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(inc)
	a.setAttribute('download', projectName.replace(/\s+/g, '-') + '.asm')
	document.body.appendChild(a)
	a.click()
	a.remove()
}).spacer().option('Reload Window', '', () => {
	window.location.reload()
})

new ContextMenu(menuViewEle).option('Toggle Help', '?', () => {
	sectionHelpEle.classList.toggle('hide')
})

new ContextMenu(menuHelpEle).option('Toggle Help', '', () => {
	sectionHelpEle.classList.toggle('hide')
})

function frequencyToGB(v) { return Math.min(2047, Math.max(0, Math.round(2048 * (v - 64) / v))) }
function midiToFrequency(v) { return 27.5 * Math.pow(2, (v - 21) / 12) }
function GBToFrequency(v) { return 131072 / (2048 - v) }
function frequencyToMidi(v) { return 12 * Math.log2(v / 440) + 69 }

function makeASMFrequencyTable() {
	let s = ''
	for (let i = 0; i < 128; i++) {
		let midi = i
		let note = NOTE_NAMES[i % 12]
		let octave = Math.floor(i / 12)
		let freq = midiToFrequency(i)
		let gb = frequencyToGB(freq)
		let freqErr = GBToFrequency(gb) - freq
		let midiErr = frequencyToMidi(GBToFrequency(gb)) - midi
		s += '\tdw ' + gb + ' ; ' + note + ' ' + octave + ' (MIDI ' + i + ') (Error: ' + round(freqErr, 3) + ' Hz, ' + round(midiErr, 3) + ' semitones)\n'
	}
	return s
}
