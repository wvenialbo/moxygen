/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

// const log = require('./logger').getLogger();

function Compound(parent, id, name)
{
  this.parent          = parent;
  this.id              = id;
  this.name            = name;
  this.compounds       = {};
  this.members         = [];
  this.basecompoundref = [];
  this.filtered        = {};
}

Compound.prototype = {

  find : function(id, name, create)
  {
    let compound = this.compounds[id];

    if (!compound && create)
    {
      compound = this.compounds[id] = new Compound(this, id, name);
    }

    return compound;
  },

  toArray : function(type, kind)
  {
    type = type || 'compounds';

    let arr = Object.keys(this[type]).map(function(key)
    {
      return this[key];
    }.bind(this[type]));

    if (type == 'compounds')
    {
      let all = [];

      arr.forEach(function(compound)
      {
        if (!kind || compound.kind == kind) // compound &&
        {
          all.push(compound);
          all = all.concat(compound.toArray(type, kind));
        }
      });

      arr = all;
    }

    return arr;
  },

  toFilteredArray : function(type)
  {
    type    = type || 'compounds';
    let all = [];

    (this.filtered[type] || []).forEach(function(item)
    {
      const children = item.toFilteredArray(type);

      all.push(item);

      all = all.concat(children);
    });

    return all;
  },

  filterChildren : function(filters, groupid)
  {
    this.toArray('compounds').forEach(function(compound)
    {
      compound.filtered.members   = compound.filter(compound.members,
                                                    'section',
                                                    filters.members, groupid);
      compound.filtered.compounds = compound.filter(compound.compounds,
                                                    'kind',
                                                    filters.compounds, groupid);
    });

    this.filtered.members   = this.filter(this.members,
                                          'section', filters.members, groupid);
    this.filtered.compounds = this.filter(this.compounds,
                                          'kind', filters.compounds, groupid);
  },

  filter : function(collection, key, filter, groupid)
  {
    const categories = {};
    let result       = [];

    Object.keys(collection).forEach(function(name)
    {
      const item = collection[name];

      if (item)
      {
        // skip empty namespaces
        if (item.kind == 'namespace')
        {
          if ((!item.filtered.compounds || !item.filtered.compounds.length)
            && (!item.filtered.members || !item.filtered.members.length))
          {
            // log.verbose('Skip empty namespace: ' + item.name);
            return;
          }
        }

        // skip items not belonging to current group
        else if (groupid && item.groupid != groupid)
        {
          // log.verbose('Skip item from foreign group: { item.kind: '
          //    + item.kind+ ', item.name: ' + item.name + ', item.groupid: '
          //   + item.groupid + ', group.id: '+ group.id + '}');
          return;
        }

        (categories[item[key]] || (categories[item[key]] = [])).push(item);
      }
    });

    filter.forEach(function(category)
    {
      result = result.concat(categories[category] || []);
    });

    return result;
  },
};

module.exports = Compound;
