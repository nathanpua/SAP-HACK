# SAP Career Coach Agent

A specialized career coaching agent built with Youtu-agent framework, specifically designed for SAP employees and SAP ecosystem professionals. This multi-agent system provides comprehensive SAP career guidance, certification planning, job market insights, and career advancement strategies within the SAP technology landscape.

## Features

- **SAP Career Path Planning**: Specialized guidance for SAP career progression and role transitions
- **SAP Certification Strategy**: Personalized certification roadmaps aligned with SAP's certification framework
- **SAP Job Market Intelligence**: Current salary data, demand trends, and opportunities in SAP ecosystem
- **SAP Skills Assessment**: Evaluate SAP technical competencies and identify development needs
- **SAP Solution Expertise**: Guidance on SAP S/4HANA, SAP Cloud, SAP Analytics, and emerging technologies
- **SAP Partner Ecosystem**: Navigate SAP partner programs and consulting opportunities
- **SAP Leadership Development**: Strategies for advancing to senior technical and leadership roles

## Quick Start

### Prerequisites

1. **Set up Youtu-agent environment** (see main README.md)
2. **Configure API keys** in your `.env` file:
   ```bash
   UTU_LLM_API_KEY=your_api_key_here
   SERPER_API_KEY=your_serper_key_here
   JINA_API_KEY=your_jina_key_here
   ```

### Running the Agent

#### Simple Career Coach (Single Agent)
```bash
# Run with CLI chat interface
python scripts/cli_chat.py --config_name career_coach --stream

# Or run the example script
# PYTHONPATH=/Users/nathanpua/Desktop/SAP\ hack/Youtu-agent:$PYTHONPATH
python examples/career_coach/main.py
```

#### Advanced SAP Career Coach (Multi-Agent Interactive Orchestra)
```bash
# Run the interactive SAP career coach with Research, Analysis, and Synthesis agents
python examples/career_coach/main_orchestra.py
```

**Interactive Features:**
- **Clarifying Questions**: The system actively asks for missing information to provide better guidance
- **Conversation Memory**: Remembers previous exchanges to provide context-aware responses
- **Follow-up Support**: Handles multiple rounds of clarification (up to 3 rounds)
- **Help Commands**: Use 'help' for guidance, 'clear' to reset conversation, 'quit' to exit

## Agent Architecture

The SAP Career Coach uses a sophisticated multi-agent orchestra system with three specialized agents:

### Research Agent (SAPResearchAgent)
- **Primary Function**: Gathers comprehensive SAP-specific career information
- **Capabilities**:
  - SAP certification programs and requirements
  - SAP job market trends and salary data
  - SAP career progression paths and opportunities
  - SAP industry partnerships and emerging technologies
  - SAP company culture and internal mobility
- **Tools**: Web search, SAP official resources, industry databases

### Analysis Agent (SAPAnalysisAgent)
- **Primary Function**: Deep analysis of SAP professional profiles and trajectories
- **Capabilities**:
  - SAP resume evaluation and optimization
  - SAP skills gap assessment and competency mapping
  - SAP certification alignment and progression planning
  - SAP project experience analysis
  - SAP leadership potential assessment
- **Tools**: Document analysis, Python data processing, SAP knowledge base

### Synthesis Agent (SAPSynthesisAgent)
- **Primary Function**: Creates comprehensive SAP career development strategies
- **Capabilities**:
  - Integration of research and analysis findings
  - Personalized SAP career roadmaps and action plans
  - SAP certification and training recommendations
  - SAP networking and professional development strategies
  - SAP compensation guidance and negotiation support
- **Tools**: Strategic planning, report generation, career modeling

## Core Functions

1. **SAP Career Path Planning**
   - Assess SAP-specific skills and certifications
   - Identify SAP career transition opportunities
   - Create personalized SAP development roadmaps

2. **SAP Certification Strategy**
   - Analyze current certification status
   - Recommend optimal certification pathways
   - Create certification timelines and study plans

3. **SAP Job Market Intelligence**
   - Research SAP role demand and compensation
   - Identify high-growth SAP specializations
   - Track SAP technology trends and opportunities

4. **SAP Skills Development**
   - Evaluate SAP technical competencies
   - Identify skill gaps for target roles
   - Recommend SAP training and hands-on projects

5. **SAP Leadership Advancement**
   - Assess leadership potential in SAP contexts
   - Develop strategies for senior SAP roles
   - Create executive presence and influence plans

### Example Interactive SAP Interactions

```
You: I want to become a SAP Solution Architect

SAP Career Coach: I'd be happy to help you plan your transition to SAP Solution Architect! To provide
you with the most accurate and personalized guidance, could you tell me:

• How many years of SAP experience do you currently have?
• What SAP modules or technologies have you worked with most?
• Do you have any specific SAP certifications already?
• What's your timeline for this career transition?

You: I have 3 years experience, mainly in SAP HCM and SD modules, no certifications yet, and I want to transition within 2 years.

SAP Career Coach: Great! Based on your 3 years of SAP HCM and SD experience, here's your personalized
Solution Architect transition plan...

You: What about salary expectations?

SAP Career Coach: For a Solution Architect role with your experience level, the salary range in major
markets would be $120K-$180K annually. Would you like me to research specific markets or consider
location preferences for more accurate data?

You: I'm in New York, remote work preferred.

SAP Career Coach: Perfect! For SAP Solution Architects in New York with remote work preferences,
the current market range is $135K-$195K, with an average of $165K...
```

**Interactive Commands:**
- `help` - Show available commands and guidance
- `clear` - Reset conversation history and start fresh
- `quit` - Exit the interactive session

## Configuration Files

### Simple Agent (`career_coach.yaml`)
- Single agent with general SAP career coaching capabilities
- Uses search, document analysis, and memory tools
- Best for basic SAP career questions and advice

### Orchestra Agent (`career_coach_orchestra.yaml`)
- **SAPResearchAgent**: Specialized SAP career research and market intelligence
- **SAPAnalysisAgent**: Deep analysis of SAP professional profiles and skill assessments
- **SAPSynthesisAgent**: Strategic SAP career planning and comprehensive guidance reports
- Best for complex SAP career transitions and advancement planning

## Customization

### Adding New Tools
You can extend the agent's capabilities by adding new tools:

```yaml
# In your config file
toolkits:
  linkedin:
    name: linkedin
    mode: builtin
    config:
      api_key: ${oc.env:LINKEDIN_API_KEY}
```

### Custom Instructions
Modify the agent instructions to specialize in specific career fields:

```yaml
agent:
  instructions: |-
    You are a specialized tech career coach focusing on software engineering careers...
```

## Integration Options

### Web Interface
```bash
# Install the web UI package first
pip install utu_agent_ui

# Run with web interface
python examples/career_coach/main_web.py
```

### API Integration
```python
from utu.agents import SimpleAgent
from utu.config import ConfigLoader

async def get_career_advice(query: str) -> str:
    config = ConfigLoader.load_agent_config("career_coach")
    async with SimpleAgent(config=config) as agent:
        return await agent.chat(query)
```

## Best Practices for SAP Career Coaching

1. **SAP Context Matters**: Provide specific details about your SAP modules, certifications, and project experience
2. **Current Role Clarity**: Describe your current SAP responsibilities, team size, and technology stack
3. **Career Goals**: Specify target SAP roles, specializations, or career levels you're aiming for
4. **Geographic Preferences**: Mention location preferences for SAP opportunities (onshore, offshore, hybrid)
5. **Timeline Expectations**: Share your desired timeline for career transitions or advancements
6. **Upload SAP Documents**: Share SAP certification transcripts, project descriptions, or performance reviews
7. **Follow SAP Trends**: Stay informed about SAP's strategic directions (S/4HANA, Cloud, Analytics, etc.)
8. **Ask Specific SAP Questions**: Request details about particular SAP technologies, certifications, or career paths

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all required API keys are set in `.env`
2. **Memory Issues**: Clear agent memory if conversations become too long
3. **Tool Failures**: Some tools may require additional configuration or API access

### Performance Tips

- Use specific search queries for better results
- Break complex questions into smaller, focused queries
- Provide context about your industry and experience level

## Contributing to SAP Career Coach

To enhance the SAP Career Coach agent:

1. **Add SAP Domain Expertise**: Contribute specialized knowledge for specific SAP modules (HCM, SD, MM, FI/CO, etc.)
2. **Expand Certification Coverage**: Add support for new SAP certification programs and learning paths
3. **Industry-Specific Scenarios**: Create specialized guidance for industries like manufacturing, retail, healthcare, etc.
4. **SAP Technology Updates**: Keep pace with SAP's evolving technology stack and cloud offerings
5. **Regional SAP Insights**: Add location-specific SAP career market intelligence
6. **SAP Partner Programs**: Enhance guidance for SAP partner ecosystems and consulting opportunities
7. **Success Story Integration**: Incorporate real SAP career transition success stories and case studies

## License

This example follows the same license as the Youtu-agent framework.
