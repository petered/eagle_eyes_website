module Jekyll
  module RelativeUrlFilter
    def relative_url(input)
      return input if input.nil? || input.empty?
      input = input.sub(%r{^/}, '')
      site = @context.registers[:site]
      
      # If baseurl is already empty, just return the input
      if site.config['baseurl'].nil? || site.config['baseurl'].empty?
        "/#{input}"
      else
        # Otherwise, join the baseurl and input
        "#{site.config['baseurl']}/#{input}".gsub(%r{/{2,}}, '/')
      end
    end
  end
end

Liquid::Template.register_filter(Jekyll::RelativeUrlFilter) 