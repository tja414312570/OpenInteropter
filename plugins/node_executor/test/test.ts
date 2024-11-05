import { access, constants, readFile, writeFile } from "fs/promises";
import path from "path";
const json = "{\n  \"default\": {\n    \"executor\": {\n      \"node\": {\n        \"nodejs\": {\n          \"version\": \"v20.18.0\"\n        }\n      }\n    }\n  }\n}"
writeFile(path.join(__dirname,'test.json'),json,'utf-8')