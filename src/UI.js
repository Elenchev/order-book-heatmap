export default class UI {
  constructor(dashboardManager) {
    this.inputEl = document.querySelector('.ui');
    this.inputs = this.parseInputs();
    const areInputsValid = this.validateInputs(this.inputs);
    if (!areInputsValid) {
      console.error('Invalid inputs');
    }

    if (!dashboardManager || !dashboardManager.dashboards) {
      console.error('Invalid dashboard manager reference');
    }
    this.dm = dashboardManager;
    this.dashboard = document.querySelector('.dashboard');

    if (!this.dashboard)
      throw('Invalid HTML template');

    this.setUpdateHandlers();
    this.updateDashboard();
  }

  updateInputs() {
    console.log('updateInputs');
    const inputs = this.parseInputs();
    const areInputsValid = this.validateInputs(inputs);

    if (areInputsValid) {
      this.inputs = inputs;
      this.updateDashboard();
    }
  }

  updateDashboard() {
    if (this.dashboardId !== undefined) {
      this.dm.remove(this.dashboardId);
    }

    this.dashboardId = this.dm.create(
      this.dashboard,
      this.inputs.symbol,
      this.inputs.updateInterval,
      this.inputs.levels,
      this.inputs.aggregation,
      this.inputs.maxHeatmapSize,
      this.inputs.colorScale,
      this.inputs.theme
    );
  }

  validateInputs(inputs) {
    if (!inputs.symbol) {
      alert('Invalid symbol');
      return false;
    }

    if (!inputs.updateInterval
      || typeof inputs.updateInterval !== 'number'
      || inputs.updateInterval < 100) {
      alert('Update interval is too low, use values > 50ms');
      return false;
    }

    if (!inputs.levels
      || typeof inputs.levels !== 'number'
      || inputs.levels < 10
      || inputs.levels > 100) {
      alert('Showing less than 5 price levels makes the charts hard to read');
      return false;
    }

    if (!inputs.aggregation
      || typeof inputs.aggregation !== 'number'
      || inputs.aggregation < 1
      || inputs.aggregation > 10) {
      alert('You cannot aggregate data over <1 price level');
      return false;
    }

    if (['linear', 'log2'].indexOf(inputs.colorScale) === -1) {
      alert('Invalid color scale input value');
      return false;
    }

    if (['rb', 'bw'].indexOf(inputs.theme) === -1) {
      alert('Invalid color theme input value');
      return false;
    }

    return true;
  }

  setUpdateHandlers() {
    const inputs = this.inputEl.querySelectorAll('select');
    for (let l = inputs.length - 1; l >= 0; l--) {
      inputs[l].addEventListener('change', () => this.updateInputs());
    }
  }

  parseInputs() {
    const symbol = this.inputEl.querySelector('.symbol select').value;
    const updateInterval = parseInt(this.inputEl.querySelector('.update-interval select').value);
    const maxHeatmapSize = parseInt(this.inputEl.querySelector('.heatmap-size select').value);
    const levels = parseInt(this.inputEl.querySelector('.levels select').value);
    const aggregation = parseInt(this.inputEl.querySelector('.aggregation select').value);
    const colorScale = this.inputEl.querySelector('.scale select').value;
    const theme = this.inputEl.querySelector('.theme select').value;

    return {
      symbol,
      updateInterval,
      maxHeatmapSize,
      levels,
      aggregation,
      colorScale,
      theme
    };
  }
}
