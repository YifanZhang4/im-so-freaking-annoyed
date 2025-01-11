import { csv } from "./index.mjs";

async function loadData() {
  const data = await csv();
  console.log("All data:", data);

  // You can now use 'data' as needed in this file
  // For example, you might want to write it to a CSV file:
  stringify(data, (err, output) => {
    if (err) throw err;
    fs.writeFileSync("output.csv", output);
  });
}

loadData().catch(console.error);
