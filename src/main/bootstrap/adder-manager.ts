import { getConfigFromFile } from "@main/config/config-manager"
import { Bootstrap } from "./bootstrap";
import {app } from 'electron';

const configure_name = "adder_list.json"
class AdderManager implements Bootstrap{
    static instance: AdderManager;
    constructor() {
        if (AdderManager.instance) {
          return AdderManager.instance;
        }
        AdderManager.instance = this;
       
      }
    init() {
        getConfigFromFile(configure_name,["https://chat.openai.com"])
    }
    public getList = ()=>{
        return  getConfigFromFile(configure_name,["https://chat.openai.com"]);
    }
    
}
module.exports  = new AdderManager() 