import * as cheerio from "cheerio";
import { convertArrayToCSV } from "convert-array-to-csv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { codes } from "./codesQ.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateCSV() {
  let allData = [];

  for (let i = 0; i < codes.length; i++) {
    let code = codes[i];
    try {
      const url = `https://www.schools.nyc.gov/schools/${code}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const $ = cheerio.load(await res.text());

      const coordinator = $(
        `div.box div.accordion div#accordion-panel-02 dl dt:contains(Parent Coordinator)`
      )
        .next()
        .text()
        .trim();
      const coordinatorNumber = coordinator.split(",");

      let i;
      for (i = 0; i <= coordinatorNumber.length - 1; i++) {
        let data = [];

        const addressGet = $('a[href^="https://maps.google.com/"]')
          .text()
          .split("  ");
        const address = addressGet[0];
        data.push(address);

        const gradesGet = $('div.box span:contains("Grades:")')
          .text()
          .split(": ");
        const grades = gradesGet[1];
        data.push(grades);

        const phoneGet = $('span.visually-hidden:contains("Phone:")')
          .parent()
          .find("span")
          .text()
          .split(":");
        const phone = phoneGet[1];
        data.push(phone);

        const principal = $(
          `div.box div.accordion div#accordion-panel-02 dl dt:contains(School Leader)`
        )
          .next()
          .text()
          .trim();
        data.push(principal);

        const website = $("li svg.icon-globe")
          .closest("li")
          .find("a")
          .attr("href");
        if (website) {
          data.push(website);
        } else {
          data.push("N/A");
        }

        data.push(coordinatorNumber[i]);

        const emailElement = $(
          `div.box div.accordion div#accordion-panel-02 dl dt:contains(Parent Coordinator)`
        )
          .next()
          .find("a");
        const href = emailElement.attr("href");

        if (href) {
          const emailGet = href.split(":");
          let email;
          if (emailGet.length > 1) {
            email = emailGet[1].split(",");
            data.push(email[i]);
          } else {
            email = emailGet;
            data.push(email);
          }
        } else {
          console.warn(`Email link not found for code ${code}`);
        }

        console.log(data);
        allData.push(data);
      }
    } catch (error) {
      console.error(`Error processing code ${code}:`, error);
    }
  }
  return allData;
}

const rows = [
  "Address",
  "Grades",
  "School Phone",
  "School Principal",
  "School Website",
  "School Parent Coordinator/Field Counsel Name",
  "SFC Email",
];

async function createAndOpenCSV() {
  try {
    const data = await generateCSV();

    // Transform the data into the correct format
    const formattedData = data.map((row) => {
      return Object.values(row).map((value) => JSON.stringify(value));
    });

    const csvFromArrayOfArrays = convertArrayToCSV(formattedData, {
      rows: [rows],
      separator: ",",
      includeEmptyRows: false,
      quoteStrings: true,
    });

    const filePath = path.join(__dirname, "output.csv");
    fs.writeFileSync(filePath, csvFromArrayOfArrays);

    // Open the file in VS Code
    const child = spawn("code.cmd", [filePath], { shell: true });
    child.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Child process exited with code ${code}`);
      } else {
        console.log("File opened successfully in VS Code");
      }
    });
  } catch (error) {
    console.error("Error creating CSV:", error);
  }
}

createAndOpenCSV().catch(console.error);
