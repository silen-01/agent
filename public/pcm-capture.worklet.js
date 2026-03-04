// Батч — меньше postMessage и вызовов API
const BATCH_SAMPLES = 4096;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.batchSize = options.processorOptions?.batchSize ?? BATCH_SAMPLES;
    this.accumulator = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input?.length) return true;
    const channel = input[0];
    if (!channel?.length) return true;

    for (let i = 0; i < channel.length; i++) {
      this.accumulator.push(channel[i]);
    }
    while (this.accumulator.length >= this.batchSize) {
      const batch = this.accumulator.splice(0, this.batchSize);
      this.port.postMessage(new Float32Array(batch));
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
