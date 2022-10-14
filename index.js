const fs = require("fs");
const util = require("util");
const path = require("path");
const cors = require("cors");
const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const exec = util.promisify(require("child_process").exec);
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const videoDir = path.join(__dirname, "/videos");
const audioDir = path.join(__dirname, "/audios");
const dest = path.join(__dirname, "../temp/chunks");

const mapChunksToContent = (dir) => {
  fs.readdir(dir, (error, files) => {
    if (error) {
      console.error(error);
    }

    const countFiles = files.length;

    files.map(async (file, index) => {
      const fileName = path.join(dir, file);
      const name = file.substring(0, file.indexOf("."));

      const { err, stout, stderr } = await exec(
        `ffmpeg -i ${fileName} -profile:v baseline -level 3.0 -s 640x360 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls ${dest}/${
          name + "_" + index
        }.m3u8`
      );

      if (err) {
        console.log(err);
      }

      if (countFiles - 1 === index) {
        const endTime = new Date();
        console.info("End preparing Files", endTime);
      }
    });
  });
};

// mapChunksToContent(videoDir);
// mapChunksToContent(audioDir);

const createOutput = (path, name, end) => {
  ffmpeg(`${path}/${name}.${end}`, { timeout: 432000 })
    .addOptions([
      "-profile:v baseline",
      "-level 3.0",
      "-start_number 0",
      "-hls_time 10",
      "-hls_list_size 0",
      "-f hls",
    ])
    .output(`temp/${name}.m3u8`)
    .on("end", () => {
      console.log("End");
    })
    .run();
};

// createOutput("audios", "sample4", "aac");

app.get("/:name", (req, res) => {
  const name = req.params.name;
  const filePath = `temp/${name}`;

  console.log(filePath);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == "ENOENT") {
        console.log(error);
      } else {
        console.log("Can't find file!");
      }
    } else {
      res.end(content, "utf-8");
    }
  });

  // const file = path.join(__dirname, `${filePath}`);

  // res.sendFile(file);
});

// app.get("/", (req, res) => {
//   console.log("Starting Stream...");
//   const filePath = `./temp/chunks${req.url}`;

//   fs.readFile(filePath, function (error, content) {
//     res.setHeader({ "Access-Control-Allow-Origin": "*" });

//     if (error) {
//       if (error.code == "ENOENT") {
//         fs.readFile("./404.html", function (error, content) {
//           res.end(content, "utf-8");
//         });
//       } else {
//         res.writeHead(500);
//         res.end(
//           "Sorry, check with the site admin for error: " + error.code + " ..\n"
//         );
//         res.end();
//       }
//     } else {
//       res.end(content, "utf-8");
//     }
//   });
// });

app.listen(8000, () => {
  console.log("Listening on port 8000!");
});
