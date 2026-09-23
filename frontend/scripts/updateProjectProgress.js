const fs = require('fs');
const path = require('path');

const outputFile = path.resolve(__dirname, '../src/config/projectProgress.ts');
const progress = {
  responsiveUI: true,
  sidebarCompleted: true,
  authGuardCompleted: true,
  dashboardCardsCompleted: true,
  projectTrackingCompleted: true,
  globalLayoutCompleted: true,
  homePageCompleted: true,
  loginPageCompleted: true,
  routesProtected: true,
  productionReadiness: true,
  ciPipeline: true,
  automatedTests: true,
  apiDocumentation: true,
  legalPages: true,
  pendingTasks: [],
  lastUpdated: new Date().toISOString()
};

const content = `export const PROJECT_PROGRESS = ${JSON.stringify(progress, null, 2)} as const;\n`;

fs.writeFileSync(outputFile, content, 'utf8');
console.log(`Updated project progress: ${outputFile}`);
