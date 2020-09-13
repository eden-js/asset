/**
 * Create Assets Task class
 *
 * @task assets
 */
class AssetsTask {
  /**
   * Construct Assets Task class
   *
   * @param {Loader} cli
   */
  constructor(cli) {
    // Set private variables
    this.cli = cli;

    // Bind public methods
    this.run = this.run.bind(this);
    this.watch = this.watch.bind(this);
  }

  /**
   * run in background
   *
   * @param {*} files 
   */
  async run(files) {
    // run models in background
    await this.cli.thread(this.thread, {
      files,

      appRoot : global.appRoot,
    });

    // reload js
    this.cli.emit('scss', 'reload');
  }

  /**
   * Run Assets Task
   *
   * @param  {array} files
   *
   * @return {Promise}
   */
  async thread(data) {
    // glob
    const fs   = require('fs-extra');
    const glob = require('@edenjs/glob');

    // glob
    for (const file of await glob(data.files)) {
      // Get amended
      let amended = file.replace(/\\/g, '/').split('bundles/');

      // Correct path
      amended = amended.pop();
      amended = amended.split('assets');
      amended.shift();
      amended = amended.join('assets');

      // Alter amended
      await fs.copy(file, `${data.appRoot}/www/public/assets/${amended}`);
    }
  }

  /**
   * Watch task
   *
   * @return {string[]}
   */
  watch() {
    // Return files
    return '/public/assets/**/*';
  }
}

/**
 * Export Assets Task class
 *
 * @type {AssetsTask}
 */
module.exports = AssetsTask;
