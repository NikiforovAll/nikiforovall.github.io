using System.ComponentModel;
using System.Threading;
using System;
using System.Collections.Generic;
using System.IO.Pipelines;
using System.Threading.Tasks;
using System.Buffers;
using System.Runtime.CompilerServices;

namespace pipelines
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var pipe = new Pipe(new PipeOptions(pauseWriterThreshold: 12, resumeWriterThreshold: 9));
            Task writing = FillPipeAsync(5, pipe.Writer);
            Task reading = ReadPipeAsync(pipe.Reader);
            await Task.WhenAll(reading, writing);
        }

        private static async Task FillPipeAsync(int iterations, PipeWriter writer)
        {
            const int minimumBufferSize = 4;
            var random = new Random();
            for (int i = 0; i < iterations; i++)
            {
                Memory<byte> memory = writer.GetMemory(minimumBufferSize);
                var numberToWrite = random.Next(int.MaxValue / 2, int.MaxValue);
                Console.WriteLine("Writing...");
                BitConverter.TryWriteBytes(memory.Span, numberToWrite);
                writer.Advance(minimumBufferSize);
                // Make the data available to the PipeReader.
                FlushResult result = await writer.FlushAsync();
                if (result.IsCompleted)
                    break;
            }
            await writer.CompleteAsync();
        }
        private static async Task ReadPipeAsync(PipeReader reader)
        {
            await foreach (var bytesReceived in GetReaderResult(reader))
            {
                foreach (var i in bytesReceived.ToArray<byte>())
                {
                    Console.Write($"{i:x3}.");
                }
                Console.WriteLine("!");
            }
        }
        private static async IAsyncEnumerable<ReadOnlySequence<byte>> GetReaderResult(
            PipeReader reader, [EnumeratorCancellation] CancellationToken token = default)
        {
            while (true && !token.IsCancellationRequested)
            {

                ReadResult result = await reader.ReadAsync();
                ReadOnlySequence<byte> buffer = result.Buffer;
                if (buffer.Length < 4)
                    yield break;
                var position = buffer.GetPosition(sizeof(int));
                Console.WriteLine("Reading...");
                yield return buffer.Slice(0, position);
                buffer = buffer.Slice(position);
                reader.AdvanceTo(buffer.Start, position);
                // Tell the PipeReader how much of the buffer has been consumed.
                // Stop reading if there's no more data coming.
                if (result.IsCompleted)
                    break;
            }
            // Mark the PipeReader as complete.
            await reader.CompleteAsync();
        }
    }
}
