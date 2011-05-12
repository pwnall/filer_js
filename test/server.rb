#!/usr/bin/env ruby
require 'digest/sha2'
require 'fileutils'
require 'openssl'

require 'rubygems'
require 'sass'
require 'sinatra'

# Create the data folder.
FileUtils.mkdir_p 'test/blobs'

# Serve templates from the same folder.
set :views, File.dirname(__FILE__)

# Test HTML.
get '/' do
  send_file 'test/index.html', :disposition => :inline
end
# Test CSS.
get '/stylesheet.css' do
  scss :stylesheet
end
# Test assets.
get '/files/*' do
  send_file File.join(File.dirname(__FILE__), '..', params[:splat])
end

# Create a descriptor for a file.
post '/blobs/:id' do
  
end

# Upload a fragment of a file.
post '/chunks/:id' do
  
end

# Get a file's metadata.
get '/blobs/metadata/:id' do
  
end

# Get 
get '/chunks/metadata/:id' do
  
end

# Download a fragment from a file.
get '/chunks/:id' do
  
end

# Download an entire file.
get '/blobs/:id' do
  
end
