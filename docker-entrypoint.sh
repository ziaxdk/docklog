#!/bin/bash

# Change the ownership of /usr/share/elasticsearch/data to elasticsearch
chown -R elasticsearch:elasticsearch /usr/share/elasticsearch/data
exec gosu elasticsearch "$@"
