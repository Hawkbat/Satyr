   _____       __            
  / ___/____ _/ /___  _______
  \__ \/ __ `/ __/ / / / ___/
 ___/ / /_/ / /_/ /_/ / /    
/____/\__,_/\__/\__, /_/     
               /____/        

Satyr is a tracker application and runtime engine for writing sound effects and music for the Gameboy and Gameboy Color. It outputs project files which can then be converted into binary blobs and RGBDS-style assembly include files. 


* Quickstart *

1. Start a new project (File > New Project)
2. Name your project in the Project Options section (upper left)
3. Create and edit waves, sequences, and patterns as desired
4. Save your project somewhere (File > Save Project...)
5. File > Download Conversion Script
6. Run the script with the command:
	node satyr-convert.js -o "path/to/whatever.bin" -i "path/to/includes/whatever.inc" "path/to/yourProject.satyr-project"
	(change the paths and filenames to match your ASM project's structure)
7. TBD (project implementation steps)


* Key Concepts *

Project: a single binary file containing all of the uncompressed source material and design-time metadata.

Wave: a waveform defined by 32 4-bit samples, used for the Gameboy's custom wavetable channel. You can add up to 128 waves per project, and assign them to the waveform channel using the W effect.

Note: a 7-bit MIDI note number in the range 36-119 which is subsequently converted to the correct frequency for Gameboy playback.

Effect: a command and associated parameters which change the current channel state, such as setting the duty cycle of a square channel or the tempo of the sequence.

Channel: one of the four hardware channels of the Gameboy, or the 'system' channel used for global effects.

Row: one 'line' within each pattern, corresponding to a fixed time within the pattern. You can add up to 256 rows per pattern.

Pattern: an array of rows combined to form one continuous section of a sequence. Each channel of the pattern can be played individually if the frame numbers differ. You can add up to 128 patterns per sequence.

Frame: one 'line' within the current sequence which specifies which pattern to play for each channel. If the patterns are different lengths, the shorter ones will loop until the longest pattern finishes. You can add up to 256 frames per sequence.

Sequence: a single song or sound effect, comprised of patterns and frames. You can add up to 256 sequences per project.


* Effect Reference *

Effect            |Key|SYS|SQ1|SQ2|WAV|NOI|Parameters
------------------+---+---+---+---+---+---+----------------------
Note              |N/A|   | Y | Y | Y |   |Note (A-G), sharp (# or -), octave (3-9)
Note (Noise)      |N/A|   |   |   |   | Y |Frequency (0-F)
Volume            |N/A|   | Y | Y |   | Y |Volume (0-F)
Volume (Wave)     |N/A|   |   |   | Y |   |Volume (0, 1, 2, or 4)
Tempo             | T | Y |   |   |   |   |Tempo (0-F, see table)
Left Main Volume  | L | Y |   |   |   |   |Volume (0-7)
Right Main Volume | R | Y |   |   |   |   |Volume (0-7)
Pan Left/Right    | P |   | Y | Y | Y | Y |Volume (0-7)
Duty Cycle        | D |   | Y | Y |   |   |Duty (12, 25, 50, or 75)
Noise Pattern     | N |   |   |   |   | Y |NR43 step & ratio (0-F)
Frequency Sweep   | S |   | Y |   |   |   |Time (0-7), direction (+ or -), step (0-7)
Volume Sweep      | V |   | Y | Y |   | Y |Direction (+ or -), step (0-7)
Wave Pattern      | W |   |   |   | Y |   |Wave Index (00-FF)
Raw Frequency     | F |   | Y | Y | Y |   |GB Frequency (000-FFF)


* Tempo Values *

The table below assumes a granularity of 16th notes and a 4/4 signature (4 16th notes per beat) to determine the BPM values.

0 =    0 BPM
1 =  900 BPM
2 =  450 BPM
3 =  300 BPM
4 =  225 BPM
5 =  180 BPM
6 =  150 BPM
7 = ~129 BPM
8 = ~113 BPM
9 =  100 BPM
A =   90 BPM
B =  ~82 BPM
C =   75 BPM
D =  ~69 BPM
E =  ~64 BPM
F =   60 BPM
