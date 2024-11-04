import { Component } from 'vue';

const pannel_mapping: Record<string, Component> = {};

export const getPannel = (pannel_addr: string): Component | undefined => {
  return pannel_mapping[pannel_addr];
};

export const addPannel = (pannel_addr: string, pannel: Component): void => {
  pannel_mapping[pannel_addr] = pannel;
};
