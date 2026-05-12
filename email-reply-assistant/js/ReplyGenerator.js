class ReplyGenerator {
    constructor() {
        this.templates = {
            commercial_inquiry: {
                formal: {
                    title: '正式商务',
                    template: `尊敬的{{person}}：

您好！

非常感谢您对{{product}}的关注与咨询。关于您询问的价格问题，我司的报价如下：

{{product}}的价格为：我们会根据您的具体需求和采购量为您提供最优惠的报价方案。为了能给您提供准确的报价，请问您方便透露一下预计的采购数量吗？

另外，我们还提供以下服务：
- 免费试用14天
- 专业技术支持团队24小时响应
- 定制化功能开发

如果您有任何其他问题或需要进一步的信息，请随时与我联系。

期待您的回复！

祝商祺！

[您的姓名]
[您的职位]
[公司名称]`
                },
                friendly: {
                    title: '友好亲切',
                    template: `您好{{person}}！

很高兴收到您的邮件，感谢您对{{product}}感兴趣！

关于您询问的价格，我先给您一个大致的参考：{{product}}有多个版本可供选择，我们可以根据您的实际使用场景和预算来推荐最适合的方案。

为了能给您一个精准的报价，能不能请您告诉我一下：
1. 您大概需要给多少人使用？
2. 有没有特别需要的功能？

这样我可以马上给您一个满意的报价！如果您愿意，我们也可以约个时间电话详谈。

随时恭候您的消息！

祝好！

[您的姓名]`
                },
                brief: {
                    title: '简洁高效',
                    template: `{{person}}您好，

感谢您的咨询。关于{{product}}的价格，我们提供灵活的定价方案。

请您提供以下信息，以便我们给出准确报价：
- 预计用户数量
- 功能需求
- 采购时间

我们将尽快为您提供详细报价单。

[您的姓名]`
                }
            },
            complaint: {
                formal: {
                    title: '正式致歉',
                    template: `尊敬的{{person}}：

您好！

首先，请允许我代表公司向您表示诚挚的歉意。对于您遇到的问题，我们深感抱歉，这确实是我们工作的疏忽。

我们已经安排专人处理您反馈的问题，预计在{{date}}之前给您一个满意的解决方案。同时，我们也会认真反思，加强内部管理，避免类似问题再次发生。

为了更好地解决问题，请问您方便提供更多细节吗？您也可以直接与我联系，电话：[您的电话]。

再次感谢您的反馈，这对我们改进服务非常重要。

祝商祺！

[您的姓名]
[您的职位]
[公司名称]`
                },
                friendly: {
                    title: '真诚致歉',
                    template: `{{person}}您好！

非常抱歉给您带来了不好的体验，我们完全理解您的心情。

我们已经认真阅读了您反馈的问题，并立即开始处理。您的问题我们会优先解决，负责的同事已经在跟进了。

如果方便的话，我们可以电话沟通一下具体情况，这样能更快地帮您解决问题。您看什么时候方便？

再次向您说声抱歉，感谢您的理解和支持。

[您的姓名]`
                },
                brief: {
                    title: '简洁回应',
                    template: `{{person}}您好，

对于您遇到的问题，我们深表歉意。

我们已经在处理中，预计{{date}}内回复解决方案。

感谢您的反馈。

[您的姓名]`
                }
            },
            status_inquiry: {
                formal: {
                    title: '正式汇报',
                    template: `尊敬的{{person}}：

您好！

感谢您的来信。关于您询问的项目进度，我向您汇报一下最新情况：

目前项目整体进展顺利，已完成约[进度百分比]。主要里程碑包括：
1. [已完成的工作]
2. [正在进行的工作]
3. [下一步计划]

预计完成时间：{{date}}

如果您需要更详细的进度报告，或者有任何疑问，请随时告诉我。

祝商祺！

[您的姓名]
[您的职位]
[公司名称]`
                },
                friendly: {
                    title: '友好更新',
                    template: `{{person}}您好！

收到您的询问了，正好来跟您同步一下最新进展😊

目前一切进展顺利！我们正在全力推进，具体情况是：
- 已经完成的部分：[列举]
- 现在正在做的：[列举]
- 接下来的计划：[列举]

我们预计在{{date}}之前可以完成。如果有任何变化，我会第一时间通知您。

您还有其他问题吗？随时问我！

祝好！

[您的姓名]`
                },
                brief: {
                    title: '简洁更新',
                    template: `{{person}}您好，

项目目前进展顺利，预计{{date}}完成。

具体进度：[简要说明]

如需详细报告，请告知。

[您的姓名]`
                }
            },
            meeting_request: {
                formal: {
                    title: '正式邀约',
                    template: `尊敬的{{person}}：

您好！

非常感谢您的来信。关于会议请求，我们非常乐意与您安排时间进行详细沟通。

请问您在{{date}}这一周是否有方便的时间？我们可以在以下时间段中选择：
- 周一至周五：上午 9:00 - 11:00
- 周一至周五：下午 2:00 - 5:00

会议可以通过以下方式进行：
- 线上视频会议（Zoom/腾讯会议）
- 线下面谈（公司地址：[地址]）
- 电话沟通

请告知您方便的时间和方式，我会立即为您安排。

期待与您的沟通！

祝商祺！

[您的姓名]
[您的职位]
[公司名称]`
                },
                friendly: {
                    title: '轻松邀约',
                    template: `{{person}}您好！

很高兴收到您的消息，我们随时都可以安排会议！

我这边时间比较灵活，您看{{date}}这一周哪天方便？早上或下午都可以。

我们可以：
- 线上聊：Zoom/腾讯会议都行
- 线下见：欢迎来我们公司坐坐
- 电话说：也可以直接打电话

您定好时间告诉我就行，我提前准备好资料。

期待和您聊聊！

祝好！

[您的姓名]`
                },
                brief: {
                    title: '简洁回应',
                    template: `{{person}}您好，

可以安排会议。请提供：
- 方便的时间
- 会议方式（线上/线下/电话）

我会立即为您安排。

[您的姓名]`
                }
            },
            general_inquiry: {
                formal: {
                    title: '正式回应',
                    template: `尊敬的{{person}}：

您好！

非常感谢您的咨询。关于您提到的问题，我司的情况如下：

[针对具体问题的正式回答]

如果您需要更详细的信息，或者有其他问题，请随时与我联系。我们很乐意为您提供帮助。

期待与您的进一步沟通！

祝商祺！

[您的姓名]
[您的职位]
[公司名称]`
                },
                friendly: {
                    title: '友好回应',
                    template: `{{person}}您好！

收到您的问题了，让我来给您解答一下😊

关于您问的：[简要回答核心问题]

如果我说得不够清楚，或者您还有其他问题，随时问我！我们也可以电话沟通，这样可能更清楚一些。

期待您的回复！

祝好！

[您的姓名]`
                },
                brief: {
                    title: '简洁回应',
                    template: `{{person}}您好，

感谢您的咨询。

[简要回答]

如需更多信息，请告知。

[您的姓名]`
                }
            }
        };
    }

    generate(intent, entities, emailContent = '') {
        const replies = [];
        const intentTemplates = this.templates[intent] || this.templates.general_inquiry;
        
        for (const [tone, config] of Object.entries(intentTemplates)) {
            const filledTemplate = this.fillTemplate(config.template, entities, emailContent);
            replies.push({
                tone: tone,
                title: config.title,
                content: filledTemplate,
                style: this.getToneStyle(tone)
            });
        }
        
        return replies;
    }

    fillTemplate(template, entities, emailContent) {
        let filled = template;
        
        const variables = {
            person: this.getBestValue(entities.person) || '客户',
            product: this.getBestValue(entities.product) || '我们的产品',
            date: this.getBestValue(entities.date) || '下周',
            amount: this.getBestValue(entities.amount) || '根据具体需求',
            company: this.getBestValue(entities.company) || '贵公司'
        };
        
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            filled = filled.replace(regex, value);
        }
        
        if (entities.product && entities.product.length > 0) {
            if (!filled.includes('发票') && !filled.includes('报销')) {
                filled = filled;
            }
        }
        
        return filled;
    }

    getBestValue(entityList) {
        if (!entityList || entityList.length === 0) return null;
        
        const sorted = [...entityList].sort((a, b) => b.confidence - a.confidence);
        return sorted[0].value;
    }

    getToneStyle(tone) {
        const styles = {
            formal: 'primary',
            friendly: 'secondary',
            brief: 'tertiary'
        };
        return styles[tone] || 'primary';
    }

    getAllIntents() {
        return Object.keys(this.templates);
    }

    getTonesForIntent(intent) {
        const intentTemplates = this.templates[intent] || this.templates.general_inquiry;
        return Object.entries(intentTemplates).map(([key, config]) => ({
            key: key,
            title: config.title
        }));
    }
}

window.ReplyGenerator = ReplyGenerator;