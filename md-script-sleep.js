// CPU-intensive loop that runs for ~35+ seconds
const startTime = Date.now();
let counter = 0;

while (Date.now() - startTime < 35000) {
  counter++;
  // Add some computational work to make it slower
  Math.sqrt(counter * Math.PI);
  Math.sin(counter);
  Math.cos(counter);
}

console.log("Counter reached:", counter);
return { message: "Loop completed", counter: counter, duration: Date.now() - startTime };
