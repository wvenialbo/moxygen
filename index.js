/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

const doxyparser = require('./src/parser');
const helpers    = require('./src/helpers');
const path       = require('path');
const templates  = require('./src/templates');

module.exports = {

  /**
   * Default options values.
   **/
  defaultOptions : {

    directory : null,            /** Location of the doxygen files **/
    output    : 'api.md',        /** Output file **/
    groups    : false,           /** Output doxygen groups separately **/
    noindex   : false,           /** Disable generation of the index. Does **
                                  *  not work with groups or class options **/
    anchors   : true,            /** Generate anchors for internal links **/
    language  : 'cpp',           /** Programming language **/
    templates : 'templates',     /** Templates directory **/
    pages     : false,           /** Output doxygen pages separately **/
    classes   : false,           /** Output doxygen classes separately **/
    output_s  : 'api_%s.md',     /** Output file for groups and classes **/
    logfile   : 'moxygen.log',   /** Log file **/
    filters   : {
      members : [
        'define',
        'enum',
        // 'enumvalue',
        'func',
        // 'variable',
        'property',
        'public-attrib',
        'public-func',
        'protected-attrib',
        'protected-func',
        'signal',
        'public-slot',
        'protected-slot',
        'public-type',
        'private-attrib',
        'private-func',
        'private-slot',
        'public-static-func',
        'private-static-func',
      ],
      compounds : [
        'namespace',
        'class',
        'struct',
        'union',
        'typedef',
        'interface',
        // 'file',
      ],
    },
  },

  /**
   * Parse files and render the output.
   **/
  run : function(options)
  {
    // Sanitize options
    if (typeof options.output == 'undefined')
    {
      if (options.classes || options.groups)
      {
        options.output = this.defaultOptions.output_s;
      }
      else
      {
        options.output = this.defaultOptions.output;
      }
    }

    if ((options.classes || options.groups)
        && options.output.indexOf('%s') === -1)
    {
      throw 'The `output` file parameter must contain an "%s" for group or '
          + 'class name substitution when `groups` or `classes` are enabled.';
    }

    if (typeof options.templates == 'undefined')
    {
      options.templates = path.join(__dirname,
                                    this.defaultOptions.templates,
                                    options.language);
    }

    // Load templates
    templates.registerHelpers(options);
    templates.load(options.templates);

    // Parse files
    doxyparser.loadIndex(options, onLoadIndex);
  },
};

function onLoadIndex(err, root, options)
{
  if (err)
  {
    throw err;
  }

  // Output groups
  if (options.groups)
  {
    const groups = root.toArray('compounds', 'group');

    if (!groups.length)
    {
      throw 'You have enabled `groups` output, but no groups were '
          + 'located in your doxygen XML files.';
    }

    groups.forEach(onGroupFound.bind(null, options));
  }

  // Output classes
  else if (options.classes)
  {
    const rootCompounds = root.toArray('compounds', 'namespace');

    if (!rootCompounds.length)
    {
      throw 'You have enabled `classes` output, but no classes were '
          + 'located in your doxygen XML files.';
    }

    rootCompounds.forEach(onRootCompoundFound.bind(null, options));
  }

  // Output single file
  else
  {
    onSingleFile(options, root);
  }

  // Output pages
  if (options.pages)
  {
    const pages = root.toArray('compounds', 'page');

    if (!pages.length)
    {
      throw 'You have enabled `pages` output, but no pages were '
          + 'located in your doxygen XML files.';
    }

    pages.forEach(onPageFound.bind(null, options));
    listCapture();
  }
}

function onSingleFile(options, root)
{
  captureStructure(0, root);

  root.filterChildren(options.filters);

  writeSingleFile(options, root);
}

function onRootCompoundFound(options, compound)
{
  captureStructure(1, compound);

  writeCompound(options, compound);

  const compounds = compound.toFilteredArray();

  compounds.forEach(onCompoundFound.bind(null, options));
}

function onCompoundFound(options, compound)
{
  captureStructure(2, compound);

  writeCompound(options, compound);
}

function onGroupFound(options, group)
{
  captureStructure(3, group);

  group.filterChildren(options.filters, group.id);

  writeCollectionCompound(options, group);
}

function onPageFound(options, page)
{
  captureStructure(4, page);

  writeCollectionCompound(options, page);
}

function writeCollectionCompound(options, collection)
{
  const compounds = collection.toFilteredArray('compounds');

  compounds.unshift(collection); // insert collection at top

  helpers.writeCompound(collection, templates.renderArray(compounds),
                        doxyparser.references, options);
}

function writeCompound(options, compound)
{
  compound.filterChildren(options.filters);

  helpers.writeCompound(compound, [ templates.render(compound) ],
                        doxyparser.references, options);
}

function writeSingleFile(options, root)
{
  const compounds = root.toFilteredArray('compounds');

  if (!options.noindex)
  {
    compounds.unshift(root); // insert root at top if index is enabled
  }

  const contents = templates.renderArray(compounds);

  contents.push('Generated by [Moxygen](https://sourcey.com/moxygen)');

  helpers.writeCompound(root, contents, doxyparser.references, options);
}

const capture = {};

function captureStructure(level, compound)
{
  if (typeof capture[level] == 'undefined')
  {
    capture[level] = { kinds : {} };
  }

  capture[level].kinds[compound.kind] = true;

  for (const key in compound)
  {
    if (Object.hasOwnProperty.call(compound, key))
    {
      capture[level][key] = true;
    }
  }
}

function listCapture()
{
  for (const index in capture)
  {
    if (Object.hasOwnProperty.call(capture, index))
    {
      let kinds = '';

      for (const key in capture[index].kinds)
      {
        if (Object.hasOwnProperty.call(capture[index].kinds, key))
        {
          kinds += (kinds ? ', ' : 'entity: ') + key;
        }
      }
      console.log(kinds);
      console.log('--------------------------------------------');
      for (const key in capture[index])
      {
        if (Object.hasOwnProperty.call(capture[index], key) && key !== 'kinds')
        {
          console.log('--> ' + key);
        }
      }
      console.log('============================================');
    }
  }
}
