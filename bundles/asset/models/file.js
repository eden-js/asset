// Require dependencies
const fs      = require('fs-extra');
const url     = require('url');
const uuid    = require('uuid');
const path    = require('path');
const config  = require('config');
const request = require('request');

// Require local class dependencies
const Model = require('model');

/**
 * Create File Model Class
 */
class File extends Model {
  /**
   * Construct File Model class
   */
  constructor(...args) {
    // Run super
    super(...args);

    // Bind public methods
    this.url = this.url.bind(this);
    this.remove = this.remove.bind(this);
    this.sanitise = this.sanitise.bind(this);
    this.transport = this.transport.bind(this);

    // Bind create methods
    this.fromURL = this.fromURL.bind(this);
    this.fromFile = this.fromFile.bind(this);
    this.fromBuffer = this.fromBuffer.bind(this);

    // Bind alias methods
    this.file = this.fromFile;
    this.buffer = this.fromBuffer;
    this.download = this.fromURL;
  }

  /**
   * Upload with buffer
   *
   * @param   {Buffer} buffer
   * @param   {string} name
   *
   * @returns {File}
   *
   * @async
   */
  async fromBuffer(buffer, name) {
    // Set extension and hash
    this.set('ext', this.get('ext') || path.extname(name).replace('.', ''));
    this.set('hash', this.get('hash') || uuid());

    // Ensure tmp dir
    fs.ensureDirSync(`${global.appRoot}/data/cache/tmp`);

    // Move File temporarily
    fs.writeFileSync(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`, buffer);

    // Return this for chainable
    await this.fromFile(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`, name);

    // Remove File
    fs.unlinkSync(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`);

    // Return this
    return this;
  }

  /**
   * Upload from url
   *
   * @param   {string} link
   *
   * @returns {File}
   *
   * @async
   */
  async fromURL(link) {
    // Get name
    const name = path.basename(url.parse(link).pathname);

    // Set extension and hash
    this.set('ext', this.get('ext') || path.extname(name).replace('.', ''));
    this.set('hash', this.get('hash') || uuid());

    // Ensure tmp dir
    fs.ensureDirSync(`${global.appRoot}/data/cache/tmp`);

    // Create request
    const res  = request.get(link);
    const dest = fs.createWriteStream(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`);

    // Res pipe dest
    res.pipe(dest);

    // Run Promise
    await new Promise((resolve) => {
      // Resolve on end
      res.on('end', resolve);
    });

    // Do File
    await this.fromFile(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`, name);

    // Remove File
    fs.unlinkSync(`${global.appRoot}/data/cache/tmp/${this.get('hash')}`);

    // Return this
    return this;
  }

  /**
   * Upload from file
   *
   * @param   {string} location
   * @param   {string} name
   *
   * @returns {File}
   *
   * @async
   */
  async fromFile(location, name) {
    // Check if File exists
    if (!fs.existsSync(location)) {
      // Throw error
      throw new Error(`Image File does not exist in ${location}`);
    }

    // Set file info
    this.set('ext', this.get('ext') || path.extname(name).replace('.', ''));
    this.set('hash', this.get('hash') || uuid());
    this.set('name', name || (this.get('hash')) + this.get('ext'));
    this.set('size', fs.statSync(location).size);
    this.set('transport', this.transport(true));

    // Run file create hook
    await this.eden.hook('file.create', this, async () => {
      // Register asset transport
      await this.transport().push(this, location);

      // Save this
      await this.save();
    });

    // Return this
    return this;
  }

  /**
   * Remove image
   *
   * @returns {Model}
   */
  remove(...args) {
    // Run file remove hook
    return this.eden.hook('file.remove', this, async () => {
      // try/catch
      try {
        // Remove asset transport
        await this.transport().remove(this);
      // eslint-disable-next-line no-empty
      } catch (e) { }

      // Remove this
      return super.remove(...args);
    });
  }

  /**
   * Gets image url
   *
   * @return {string}
   */
  url() {
    // Return asset transport url
    return this.transport() ? this.transport().url(this) : null;
  }

  /**
   * return transport class
   *
   * @param {Boolean} name
   *
   * @return {Transport}
   */
  transport(name) {
    // get transport
    const transport = this.get('transport') || config.get('asset.transport') || 'local';

    // return transport
    if (name) return transport;

    // get transport
    const transportClass = this.eden.register(`asset.transport.${transport}`);

    // return transport class
    return transportClass;
  }

  /**
   * Sanitise image
   *
   * @return {object} sanitised
   *
   * @async
   */
  async sanitise() {
    // return sanitised
    return {
      id      : this.get('_id') ? this.get('_id').toString() : null,
      url     : await this.url(),
      name    : this.get('name'),
      hash    : this.get('hash'),
      created : this.get('created_at'),
      updated : this.get('updated_at'),
    };
  }
}

/**
 * Export File Model class
 *
 * @type {File}
 */
module.exports = File;
