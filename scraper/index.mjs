import * as cheerio from "cheerio";
import { stringify } from "csv-stringify";
import fs from "fs";
import { codes } from "./codes.js";

async function csv() {
  let allData = [];

  for (const code of codes) {
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
      for (i = 0; i < coordinatorNumber.length; i++) {
        const data = [];

        const addressGet = $('a[href^="https://maps.google.com/"]')
          .text()
          .split("  ");
        const address = addressGet[0];
        data.push({ name: "Address", value: address });

        const gradesGet = $('div.box span:contains("Grades:")')
          .text()
          .split(": ");
        const grades = gradesGet[1];
        data.push({ name: "Grades", value: grades });

        const phoneElement = $('span.visually-hidden:contains("Phone:")')
          .parent()
          .find("span");
        const phoneText = phoneElement.length ? phoneElement.text() : "";
        const phone = phoneText.split(":");
        data.push({ name: "School Phone", value: phone });

        const principal = $(
          `div.box div.accordion div#accordion-panel-02 dl dt:contains(School Leader)`
        )
          .next()
          .text()
          .trim();
        data.push({ name: "School Principal", value: principal });

        const website = $("li svg.icon-globe")
          .closest("li")
          .find("a")
          .attr("href");
        data.push({ name: "School Website", value: website });

        data.push({
          name: "School Parent Coordinator/Field Counsel Name",
          value: coordinator[i],
        });

        if (coordinatorNumber.length > 1) {
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
              data.push({ name: "SFC Email", value: email[i] });
            } else {
              console.warn(
                `No valid email found in the href attribute for code ${code}`
              );
            }
          } else {
            console.warn(`Email link not found for code ${code}`);
          }
        } else {
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
              email = emailGet[1];
              data.push({ name: "SFC Email", value: email });
            } else {
              console.warn(
                `No valid email found in the href attribute for code ${code}`
              );
            }
          } else {
            console.warn(`Email link not found for code ${code}`);
          }

          data.push({ name: "SFC Email", value: "" }); // Add an empty string as a placeholder
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

await csv();

async function writeToCSV(data) {
  const writer = stringify({
    header: true,
    rowDelimiter: "\n",
  });

  const stream = fs.createWriteStream("output.csv");

  writer.on("readable", () => {
    let record;
    while ((record = writer.read()) !== null) {
      stream.write(record);
    }
  });

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  stream.end();
}

// Call this function after csv()
writeToCSV(await csv());
