// Батч — меньше postMessage. Кольцевой буфер без splice.
const BATCH_SAMPLES = 4096;
const BUF_CAPACITY = 16384;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.batchSize = options.processorOptions?.batchSize ?? BATCH_SAMPLES;
    this.buffer = new Float32Array(BUF_CAPACITY);
    this.readIndex = 0;
    this.writeIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input?.length) return true;
    const channel = input[0];
    if (!channel?.length) return true;

    const buf = this.buffer;
    const batchSize = this.batchSize;
    const cap = buf.length;
    let ri = this.readIndex;
    let wi = this.writeIndex;

    for (let i = 0; i < channel.length; i++) {
      buf[wi % cap] = channel[i];
      wi++;
    }
    this.writeIndex = wi;

    while (wi - ri >= batchSize) {
      const batch = new Float32Array(batchSize);
      const start = ri % cap;
      for (let j = 0; j < batchSize; j++) {
        batch[j] = buf[(start + j) % cap];
      }
      this.port.postMessage(batch);
      ri += batchSize;
      this.readIndex = ri;
    }

    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
